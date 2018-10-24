import $ from "jquery";
import _ from 'lodash';
import spinner from './static/spinner.gif';
import {getGithubJobsData, getGithubJobPostingData, alternateColors, getWeatherImage, MiniPerformance} from './utils';
import PerformanceTimer from './PerformanceTimer';
const $appContainer = $("#app");
const $extraSections = $("#extrasections");
const $startButton = $("#start-button");
let $specificJobSection;
let jobsData;
let nextPageData;
let nextPage = 1;

/////////////////////////////////////////////////////////////
// Wont need to modify these functions
/////////////////////////////////////////////////////////////
const addInitialSections = () => {
    $startButton.hide();
    $appContainer.append(`<h1>Github Jobs</h1>`);
    $appContainer.append(`<a id="next-page" href="javascript:void(0)">Next Page </a>`);
    $specificJobSection = $(`<div id="specific-job"></div>`);
    $appContainer.append($specificJobSection);
};

const factorialAddSections = ($sectionToNest = $extraSections, nestedDiv = 0) => {
    while(nestedDiv < 14) {
        nestedDiv++;
        const $nextSection = $("<span>");
        $nextSection.innerText = " ";
        $sectionToNest.append($nextSection);
        factorialAddSections($nextSection, nestedDiv);
    }
};
/////////////////////////////////////////////////////////////

const addSingleJobDataToPage = jobData => {
    $specificJobSection.empty()
        .append(`<h2>${jobData.title}</h2>`)
        .append(`<h3>${jobData.location}</h3>`)
        .append(`<h3>Weather: <img id="weather-image" src="${jobData.weatherImage}"></h3>`)
        .append(`<h3>${jobData.company}</h3>`)
        .append(`${jobData.description}`);
};

const setupScrollHandler = () => {
    $(document).on(`scroll`, _.debounce(alternateColors, 200));
};

const appendDataToThePage = data => {
    const timer = MiniPerformance.start(`adding github data to page`);
    const $table = $(`<table class="maintable"></table>`);
    $table.append(`<tr><td>Company</td><td>Title</td><td>Location</td><td>Logo</td></tr>`);
    data.forEach((datum) => {
        $table.append(
            `<tr><td>${datum.company}</td><td><a class="job-title" id="${datum.id}" href="javascript:void(0)">${datum.title}</a></td><td>${datum.location}</td><td><img src="${datum.company_logo}" /></td></tr>`
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

const bootStrap = () => {
    getGithubJobsData({page: 0}).then(handleGithubJobsDataResponse);
};


// Do not edit below
factorialAddSections();
$startButton.on("click", bootStrap);
