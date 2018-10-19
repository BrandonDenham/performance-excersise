const express = require('express');
const fetch = require('node-fetch');


const app = express();
const port = 1235;


const fetchOptions = {
    method: `get`,
    headers: {
        'Content-Type': `application/json; charset=UTF-8`,
        'Accept': `application/json`
    },
};

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/weatherimage', (req, res) => {
    const {location} = req.query;
    fetch(`https://www.metaweather.com/api/location/search/?query=${location}`)
        .then(response => {
            return response.json();
        })
        .then((response) => {
            const id = response.length ? response[0].woeid : 2487956;
            return fetch(`https://www.metaweather.com/api/location/${id}`);
        })
        .then(response => response.json())
        .then((finalResponse) => {
            const abbreviation = finalResponse.consolidated_weather[0].weather_state_abbr;
            res.json({
               weatherImage: `https://www.metaweather.com/static/img/weather/png/64/${abbreviation}.png`
            });
        });
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`))