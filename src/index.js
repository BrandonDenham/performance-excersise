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





const setupScrollHandler = () => {
    $(document).on(`scroll`, alternateColors);
};

const addSingleJobDataToPage = jobData => {
    $specificJobSection.empty()
        .append(`<h2>${jobData.title}</h2>`)
        .append(`<h3>${jobData.location}</h3>`)
        .append(`<h3>Weather: <img id="weather-image" src="${jobData.weatherImage}"></h3>`)
        .append(`<h3>${jobData.company}</h3>`)
        .append(`${jobData.description}`);
};

const setupClickHandler = () => {
    $(`.job-title`).click(function() {
        window.scrollTo(0,0);
        const id = $(this).attr("id");
        getGithubJobPostingData(id)
            .then(data => {
                // getting the weather from another (slow) api
                return getWeatherImage(data.location).then((weatherImage) => {
                    return {
                        ...data,
                        weatherImage
                    }
                });
            })
            .then(addSingleJobDataToPage);
    });
};

const appendDataToThePage = data => {
    const timer = MiniPerformance.start(`adding github data to page`);
    $appContainer.append($(`<table></table>`));
    $(`table`).append(`<tr><td>Company</td><td>Title</td><td>Location</td><td>Logo</td></tr>`);
    data.forEach((datum) => {
        $(`table`).append(
            `<tr><td>${datum.company}</td><td><a class="job-title" id="${datum.id}" href="javascript:void(0)">${datum.title}</a></td><td>${datum.location}</td><td><img src="${datum.company_logo}" /></td></tr>`
        );
    });
    timer.end();
    setupScrollHandler();
    setupClickHandler();
};

const handleGithubJobsDataResponse = (data) => {
    addInitialSections();
    appendDataToThePage(data)
};

const bootStrap = () => {
    getGithubJobsData({page: 0}).then(handleGithubJobsDataResponse);
};


// Do not edit below
factorialAddSections();
$startButton.on("click", bootStrap);
