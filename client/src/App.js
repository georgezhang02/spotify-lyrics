import React from 'react';
import "./App.css";
import SpotifyLogin from "./Components/SpotifyLogin";
import spotifyIcon from './res/spotify_icon.png';
import { BeatLoader } from 'react-spinners';
import $ from 'jquery';

import Spotify from 'spotify-web-api-js';

const spotifyWebAPI = new Spotify();

class App extends React.Component {

    state = {
        signedIn: false,
        username: null,
        loading: true,
        lyrics: null,
    }

    // Save song details as cache so screen doesn't re-render when updated
    cache = {
        oldSong: null,
        currentSong: null,
        artists: null,
    }

    // Get parameters from URL (Spotify made function
    getHashParams = () => {
        let hashParams = {};
        let e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    componentDidMount() {

        // Get any new token
        let params = this.getHashParams();

        let newToken = params.access_token;
        let newRefresh = params.refresh_token;

        // If there are new tokens, save them and reset the url
        if (newToken != null) {
            localStorage.setItem('access_token', newToken);
            localStorage.setItem('refresh_token', newRefresh);
            window.location.replace("http://localhost:3000/");
        }

        // If there are no new tokens
        else {

            // If no access token is currently saved, go to login screen
            if (!localStorage.hasOwnProperty('access_token')) {
                this.setState({
                    loading: false
                })
            }

            // If an access token is saved, attempt to load the new information
            else {
                let savedToken = localStorage.getItem('access_token');
                this.getUser(savedToken);
            }

        }

        // Update every second
        this.setState({
            interval: setInterval(() => this.setState({ time: Date.now() }), 1000)
        });

    }

    // Clear interval when closed
    componentWillUnmount() {
        clearInterval(this.state.interval);
    }

    // Get the user information given the access token
    getUser = (access_token) => {

        spotifyWebAPI.setAccessToken(access_token);
        spotifyWebAPI.getMe()
            .then((res) => {

                // If no errors, save user name, then get the song name
                this.setState({
                    signedIn: true,
                    username: res.display_name
                });

                this.getInfo();

            }).catch((err) => {

                // Token expired error
                if (JSON.parse(err.response).error.message === "The access token expired") {
                    console.log("token expired");
                    let refreshToken = localStorage.getItem('refresh_token');
                    console.log(refreshToken);
                    window.location.replace("http://localhost:8888/?refresh_token=" + refreshToken);
                }

                // Any other errors, remove locally stored tokens and go to login
                else {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');

                    this.setState({
                        signedIn: false,
                        loading: false
                    });
                }
            });
    }

    // Get the current song's information
    getInfo = () => {

        spotifyWebAPI.getMyCurrentPlaybackState()
            .then((res) => {

                // If a song is not playing, set the current song to null
                if (res.item == null) {

                    // If there was a song playing, reset lyrics
                    if (this.cache.oldSong != null) {
                        this.setState({
                            lyrics: null
                        })
                    }

                    this.cache.currentSong = null;
                    this.cache.artists = null;
                    this.cache.oldSong = null;
                }

                // If a song is playing, save the song name and artists
                else {

                    this.cache.currentSong = res.item.name;
                    this.cache.artists = res.item.artists.map((artist) => artist.name);

                    // If this is a new song, reset lyrics, and get new lyrics
                    if (this.cache.currentSong !== this.cache.oldSong) {
                        this.cache.oldSong = this.cache.currentSong;
                        this.setState({
                            lyrics: null
                        });
                        this.getLyrics(this.cache.currentSong);
                    }
                }

                // Stop loading if still doing so
                if (this.state.loading) {
                    this.setState({
                        loading: false
                    })
                }

            })
    }

    // Get lyrics
    getLyrics = (currentSong) => {

        // Get the URL
        let songName = this.cache.currentSong
        let songNameString = songName.replace(/ *\([^)]*\) */g, "").replace(/[^a-zA-Z0-9]+/g, " ").split(" ").join("%20");
        let artists = this.cache.artists;
        let artistString = artists[0].replace(/[^a-zA-Z0-9]+/g, " ").split(" ").join("%20");
        let searchURL = "https://genius.com/search?q=" + songNameString + "%20" + artistString;

        console.log(searchURL);

        this.ajaxGetURL((url) => {

            console.log(url);

            // Get lyrics based on URL
            this.ajaxGetLyrics((lyrics) => {

                // If it's still the same song, set the lyrics
                if (currentSong === this.cache.currentSong){
                    this.setState({
                        lyrics: lyrics
                    })
                }
            }, url);
        }, searchURL);
    }

    ajaxGetURL = (callback, searchURL) => {
        $.ajax({
            type: 'get',
            url: 'http://localhost:8888/url?searchurl='+searchURL,
            success: function (data) {
                callback(data);
            }
        });
    }

    ajaxGetLyrics = (callback, url) => {

        $.ajax({
            type: 'get',
            url: 'http://localhost:8888/lyrics?url='+url,
            success: function (data) {
                callback(data[0]);
            }
        });
    }

    // Render function
    render() {

        // If still loading, display beatloader
        if (this.state.loading) {

            return (
                <div className="App" style={container}>
                    <BeatLoader color={'white'}/>
                </div>
            )

        }

        // If signed in, get user and song info
        if (this.state.signedIn) {

            this.getInfo();

            return (
                <div className="App" style={container}>
                    <h1>Welcome {this.state.username}!</h1>

                    {this.cache.currentSong != null ?
                        (<p style={infoText}>Now Playing: {this.cache.currentSong} | {this.cache.artists.join(", ")}</p>)
                        :
                        (<p style={infoText}>No song is playing</p>)
                    }

                    <p style={lyrics}>{this.state.lyrics}</p>

                </div>
            );

        }

        // If not signed in, show login screen
        else {

            return (
                <div className="App" style={container}>
                    <h1>Spotify Lyrics</h1>
                    <p style={infoText}>Get the lyrics of the song you're listening to right now by connecting to your spotify account!</p>
                    <img style={icon} src={spotifyIcon} alt="Spotify Icon"/>
                    <SpotifyLogin />
                </div>
            );
        }
    }
}

const container = {
    textAlign: "center",
    backgroundColor: "#282c34",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
}

const infoText = {
    marginLeft: 50,
    marginRight: 50,
    marginBottom: 30,
    fontSize: 25
}

const lyrics = {
    marginLeft: 50,
    marginRight: 50,
    marginBottom: 30,
    fontSize: 18
}

const icon = {
    width: 100,
    height: 100,
    marginBottom: 50
}

export default App;
