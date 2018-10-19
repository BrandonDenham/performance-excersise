import $ from "jquery";
let jobsData;
let nextPageData;
let nextPage = 1;

export const convertObjectToQueryString = query => {
    const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join(`&`);
    return queryString.length ? `${queryString}&` : ``;
};

const wait = (ms) => {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
        now = Date.now();
    }
};

export const getWeatherImage = (location) => {
    location = location.split(',')[0];
    return $.getJSON(
        `http://localhost:1235/weatherimage?location=${location}`
    ).then(({weatherImage}) => weatherImage);
};

let timesAlternateColorsCalled = 0;
export const alternateColors = () => {
    // Do not refactor, intentionally slow
    timesAlternateColorsCalled++;
    console.log(`alternate colors called ${timesAlternateColorsCalled} times`);
    setTimeout(() => {
        wait(10);
        $("td").each(function (index) {
            const flipValue = Math.floor(Math.random()*2);
            if ((flipValue + index) % 2) {
                $(this).attr(`class`, `red`);
            } else {
                $(this).attr(`class`, `green`);
            }
        });
    }, 1);
};

let lastPageRequested = 0;
export const getGithubJobsData = (query) => {
    return new Promise(resolve => {
        if (query.page) {
            lastPageRequested = query.page;
        }
        const queryString = convertObjectToQueryString(query);
        $.getJSON(
            `https://jobs.github.com/positions.json?${queryString}callback=?`, resolve
        );
    });
};

export const getGithubJobPostingData = (jobId) => {
    return getGithubJobsData({page: lastPageRequested}).then((data) => {
        return data.find(({id}) => id === jobId);
    });
};

export class MiniPerformance {
    static start(metric) {
        const startTime = performance.now();
        return new MiniPerformance(startTime, metric);
    }

    constructor(startTime, metric) {
        this.startTime = startTime;
        this.metric = metric;
    }

    end() {
        const endTime = performance.now();
        console.log(`Time for ${this.metric} was ${endTime - this.startTime}ms`);
    }
}










// Solutions -- DONT LOOK YOU CHEATING CHEATERS -- :)









const setupScrollHandler = () => {
    $(document).on(`scroll`, _.debounce(alternateColors, 200));
};

const appendDataToThePage = data => {
    const timer = MiniPerformance.start(`adding github data to page`);
    const $table = $(`<table class="maintable"></table>`);
    $table.append(`<tr><td>Company</td><td>Title</td><td>Location</td><td>Logo</td></tr>`);
    data.forEach((datum) => {
        $table.append(
            `<tr><td>${datum.company}</td><td>${datum.title}</td><td>${datum.location}</td><td><img src="${datum.company_logo}" /></td></tr>`
        );
    });
    $appContainer.append($table);
    timer.end();
    setupScrollHandler();
    setupClickHandler();
};

const mapJobsData = data => data.reduce((dataMap, datum) => {
    dataMap[datum.id] = datum;
    return dataMap;
}, {});


const processJobsResponseData = (data) => {
    appendDataToThePage(data);
    // as this is expensive I could do it asynchronously but I didn't
    jobsData = mapJobsData(data);
    nextPageData =  getGithubJobsData({page: nextPage});
    nextPage++;
};

const handleGithubJobsDataResponse = (data) => {
    addInitialSections();
    processJobsResponseData(data);
    $("#next-page").click(() => {
        $appContainer.find('table').remove();
        nextPageData.then(processJobsResponseData)
    });
};


const setupClickHandler = () => {
    $(`.job-title`).click(function() {
        window.scrollTo(0,0);
        const id = $(this).attr("id");
        const jobData = jobsData[id];
        jobData['weatherImage'] = spinner;
        addSingleJobDataToPage(jobData);
        // getting the weather from another (slow) api
        getWeatherImage(jobData.location).then((weatherImage) => {
            $("#weather-image").attr("src", weatherImage);
        });
    });
};