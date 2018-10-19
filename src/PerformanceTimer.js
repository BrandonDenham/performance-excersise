import camelCase from 'lodash/camelCase';

const timers = {};

const NUMBERS_LETTERS_SPACE_REGEX = /^[a-zA-Z0-9 ]*$/;

const shouldMonitorPerformanceFeatureFlag = true;
const shouldLogPerformanceFeatureFlag = true;

class NoPerformanceTimer {
    static create() {
        return new NoPerformanceTimer();
    }

    static get(name) {
        if (!name) {
            return {};
        }
        return new NoPerformanceTimer(name);
    }

    start() {
        return this;
    }
    setMarker() {}
    end() {}
}

/**
 * PerformanceTimer allows developers to programmatically write client performance monitoring
 * to optimize front end end code.
 *
 * Markers are set at various points in script execution by the dev.  The Performance Timer will calculate
 * the time between each marker up to microsecond accuracy (depending on browser). The performance Timer
 * must be enabled with the "Enable UI Performance Measurement" feature flag in VMC
 *
 * Results can be analyzed using the performance tab in dev tools and the timer will also log results
 * that can be consumed by kibana or other tools used to process logs.  For metrics that should be logged, logMarker
 * must be set to true and the "Log UI Performance Metrics" feature flag must be enabled in VMC
 */
class PerformanceTimerImpl {

    /**
     * Creates a Performance Timer
     *
     * @param {String} name - alphanumeric name for this particular timer
     * @param {Object} additionalParameters - Object of additional properties that will be sent to logs
     * @returns {PerformanceTimerImpl}
     */
    static create(name, additionalParameters) {
        return new PerformanceTimerImpl(name, additionalParameters);
    }

    /**
     * Returns the name of a specific timer, or a map of all timers if they exist
     * used to find a particular timer across files
     *
     * @param {String} name of existing timer. Allows access to timers across
     * @returns {PerformanceTimer}
     */
    static get(name) {
        if (!name) {
            return timers;
        }
        const timer = timers[name];
        if (!timer) {
            console.warn(`${name} Performance timer does not exist`);
            return NoPerformanceTimer.create(name);
        }
        return timer;
    }

    constructor(name, additionalParameters) {
        if (!NUMBERS_LETTERS_SPACE_REGEX.test(name) || !name){
            throw new TypeError(`${name} invalid. Performance timer name must be alphanumeric with no spaces.`)
        }
        this._name = name;
        this.additionalParameters = additionalParameters;
        this.lastMarker = `Start`;
        this.measuresToLog = new Set();
        this.markers = new Set([`${this._name} ${this.lastMarker}`]);
        this.measures = new Set();
        timers[name] = this;
    }

    /**
     * Begin performance measurement.  Set the first marker as "Start"
     * @returns {PerformanceTimerImpl}
     */
    start() {
        this._performanceMark(`${this._name} ${this.lastMarker}`);
        return this;
    }

    /**
     * Set a measurement point in the application.  By default (only the markerName parameter), time will
     * be measured from the immediate previously set marker to the current marker being set.
     *
     * However this behavior can be overwritten by additional parameters to measure duration between earlier
     * markers or even well know default events like "domContentLoaded"
     *
     * It is best to use human readable names for the markerName like "Endpoint Start" because
     * it will make debugging less tedious in the performance dev tools.
     *
     *
     * @param {String} markerName - AlphaNumeric with spaces and readable
     * @param {boolean} logMarker - whether to send logs for this metric to the server, defaults to false, feature flag must be enabled
     * @param {String} measureFromMarker - optional name of marker to measure duration from.  Defaults to previous marker on performance timer
     * @param {String} otherMarkers - optional can add any number of additional markers and performance will be measured between all of them and this marker
     */
    setMarker({markerName, logMarker = false}, measureFromMarker = this.lastMarker, ...otherMarkers) {
        if (!NUMBERS_LETTERS_SPACE_REGEX.test(markerName) || !markerName){
            throw new TypeError(`${markerName} invalid. Performance timer marker may contain letters, numbers and spaces only.`);
        }
        const marker = `${this._name} ${markerName}`;
        if (this.markers.has(marker)) {
            console.warn(`Marker name ${markerName} already exists on ${this._name} PerformanceTimer. Cannot set this marker.`);
            return;
        }
        this.markers.add(marker);
        this.lastMarker = markerName;
        this._performanceMark(marker);
        [measureFromMarker, ...otherMarkers].forEach(startMarker => {
            // If no custom mark, could be standard dom mark
            const customMark = `${this._name} ${startMarker}`;
            const performanceMark = this.markers.has(customMark) ? customMark : startMarker;
            this._performanceMeasure(performanceMark, marker, logMarker);
        });
    }

    /**
     * Ends this performance measurement, and logs any pending logs to the server.
     * It is very important to call end on every performance timer in order to
     * clean up teh timers from the in memory store
     *
     * @param {boolean} logMarker - should log the entire performance event
     */
    end(logMarker = false) {
        this.setMarker({markerName: `End`, logMarker}, `Start`);
        this._sendToServer();
        this._cleanup();
    }

    _sendToServer() {
        if (!shouldLogPerformanceFeatureFlag) {
            return;
        }
        const metrics = this._extractDataForServer();
        if (!metrics) {
            return;
        }
        const messageToServer = {
            // current way parameters are logged
            moreInfo: {
                Params: {
                    ...this.additionalParameters,
                }
            },
            ...metrics,
        };
        console.log('will be sent to server in vault');
        console.log(messageToServer);
    }

    _extractDataForServer() {
        const toLog = Array.from(this.measuresToLog);
        if (!toLog.length) {
            return false;
        }
        return toLog.reduce((metrics, measure) => {
            return {
                ...metrics,
                [camelCase(measure)]: Number
                    .parseFloat(window.performance.getEntriesByName(measure, `measure`)[0].duration.toFixed(2)),
            }
        }, {});
    }

    _clearMeasures () {
        this.measures.forEach(measure => window.performance.clearMeasures(measure));
    }

    _cleanup() {
        this._clearTimer();
        this._clearMarkers();
        this._clearMeasures();
    }

    _clearTimer() {
        delete timers[this._name];
    }

    _clearMarkers () {
        this.markers.forEach(marker => window.performance.clearMarks(marker));
    }

    _performanceMark(...args) {
        try {
            return window.performance.mark(...args);
        } catch (error) {
            console.warn(error);
        }
    }

    _performanceMeasure(startMarker, endMarker, logMeasure) {
        // don't want to throw if startMarker from developer doesn't exist
        try {
            const measure = `${startMarker} to ${endMarker}`;
            window.performance.measure(measure, startMarker, endMarker);
            this.measures.add(measure);
            if (logMeasure) {
                this.measuresToLog.add(measure);
            }
        } catch (error) {
            console.warn(error);
        }
    }
}

const recordPerformance = shouldMonitorPerformanceFeatureFlag && window.performance && window.performance.measure;
const PerformanceTimer = recordPerformance ? PerformanceTimerImpl : NoPerformanceTimer;

export default PerformanceTimer;