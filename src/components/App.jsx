import React, { Component, Link } from 'react'
import Profile from './Profile.jsx'
import Reader from './Reader.jsx'
import Signin from './Signin.jsx'
import { UserSession, AppConfig } from 'blockstack'
import { Switch, Route } from 'react-router-dom'

const appConfig = new AppConfig()
const userSession = new UserSession({ appConfig: appConfig })

export default class App extends Component {
  constructor(props) {
    super(props)
  }

  handleSignIn(e) {
    e.preventDefault()
    userSession.redirectToSignIn()
  }

  handleSignOut(e) {
    e.preventDefault()
    userSession.signUserOut(window.location.origin)
  }

  render() {
    return (
      <div className="site-wrapper">
        <div className="site-wrapper-inner">
          {!userSession.isUserSignedIn() ? (
            <Signin
              userSession={userSession}
              handleSignIn={this.handleSignIn}
            />
          ) : (
            <Switch>
              <Route
                exact
                path="/"
                render={routeProps => (
                  <Profile
                    userSession={userSession}
                    handleSignOut={this.handleSignOut}
                    {...routeProps}
                  />
                )}
              />
              <Route
                path="/reader"
                render={routeProps => (
                  <Reader userSession={userSession} {...routeProps} />
                )}
              />
            </Switch>
          )}
        </div>
      </div>
    )
  }

  componentWillMount() {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then(userData => {
        window.location = window.location.origin
      })
    }
  }
}
