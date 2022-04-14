import React from 'react';
import Button from '@material-ui/core/Button';
class SpotifyLogin extends React.Component {

    connect() {
        window.location.replace("http://localhost:8888/login");
    }

    render() {
        return (
            <div>
                <Button style={connectButton} onClick={this.connect}>
                    Login to Spotify
                </Button>
            </div>
        );
    }
}

const connectButton = {
    backgroundColor: '#1DB954',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    fontSize: 15
};

export default SpotifyLogin;
