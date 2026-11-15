import React, { Component } from 'react';
import Particles from 'react-tsparticles';
import FaceRecognition from './components/FaceRecognition/FaceRecognition';
import Navigation from './components/Navigation/Navigation';
import Signin from './components/Signin/Signin';
import Register from './components/Register/Register';
import Logo from './components/Logo/Logo';
import ImageLinkForm from './components/ImageLinkForm/ImageLinkForm';
import Rank from './components/Rank/Rank';
import { detectFaces } from './faceDetector';
import './App.css';

const particlesOptions = {
  fullScreen: { enable: false },
  particles: {
    links: { enable: true },
    move: { enable: true },
    number: {
      value: 30,
      density: {
        enable: true,
        area: 800
      }
    }
  }
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      input: '',
      imageUrl: '',
      box: {},
      route: 'signin',
      isSignedIn: false,
      user: {
        id: '',
        name: '',
        email: '',
        entries: 0,
        joined: ''
      }
    }
  }

  loadUser = (data) => {
    this.setState({user: {
      id: data._id,
      name: data.name,
      email: data.email,
      entries: data.entries,
      joined: data.createdAt
    }});
  }

  calculateFaceLocation = (face) => {
    const image = document.getElementById('inputimage');
    const width = Number(image.width);
    const height = Number(image.height);
    return {
      leftCol: face.left * width,
      topRow: face.top * height,
      rightCol: width - (face.right * width),
      bottomRow: height - (face.bottom * height)
    }
  }

  displayFaceBox = (box) => {
    this.setState({box: box});
  }

  onInputChange = (event) => {
    this.setState({input: event.target.value});
  }

  onButtonSubmit = () => {
    const { input } = this.state;
    if (!input) {
      return;
    }
    // Serve the image through our own origin so the browser can read its pixels.
    const proxiedUrl = `/api/images/proxy?url=${encodeURIComponent(input)}`;
    this.setState({ imageUrl: proxiedUrl, box: {} });
  }

  onImageLoad = (event) => {
    detectFaces(event.target)
      .then(faces => {
        fetch('/api/users/image', {
          method: 'put',
        })
        .then(response => response.json())
        .then(res => {
          this.setState(Object.assign(this.state.user, { entries: res.entries}))
        })
        .catch(err => {console.log(err)});

        if (faces.length) {
          this.displayFaceBox(this.calculateFaceLocation(faces[0]));
        }
      })
      .catch(err => console.log(err));
  }

  onRouteChange = (route) => {
    if (route === 'signout') {
      this.setState({isSignedIn: false});
      fetch('/api/sessions/me', {
        method: 'delete',
      })
      .catch(err => console.log(err));
    } else if (route === 'home') {
      this.setState({isSignedIn: true})
    }
    this.setState({route: route});
  }

  render() {
    const { isSignedIn, imageUrl, route, box } = this.state;
    return (
      <div className="App">
        <Particles className='particles' options={particlesOptions} />
        <Navigation isSignedIn={isSignedIn} onRouteChange={this.onRouteChange} />
        { route === 'home'
          ? <div>
              <Logo />
              <Rank
                name={this.state.user.name}
                entries={this.state.user.entries}
              />
              <ImageLinkForm
                onInputChange={this.onInputChange}
                onButtonSubmit={this.onButtonSubmit}
              />
              <FaceRecognition box={box} imageUrl={imageUrl} onImageLoad={this.onImageLoad} />
            </div>
          : (
             route === 'signin' || route === 'signout'
             ? <Signin loadUser={this.loadUser} onRouteChange={this.onRouteChange}/>
             : <Register loadUser={this.loadUser} onRouteChange={this.onRouteChange}/>
            )
        }
      </div>
    );
  }
}

export default App;
