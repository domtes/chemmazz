import React from 'react';
import { Route, Switch } from 'wouter';

import { StateProvider } from './context/store';
import { ChatProvider } from './context/chatContext';

import LobbyPage from './pages/LobbyPage';
import PlayRoomPage from './pages/PlayRoomPage';

import { Layout } from 'antd';
import 'antd/dist/antd.css';
import 'antd/dist/antd.dark.css';
import './App.css';

const { Content } = Layout;

function App() {
  return (
    <StateProvider>
      <ChatProvider>
        <Layout className='App'>
          <Content>
            <Switch>
              <Route path='/' component={LobbyPage} />
              <Route path='/r/:roomId' component={PlayRoomPage} />
            </Switch>
          </Content>
          {/* <Footer>Made with all the ❤️  by <a href='https://twitter.com/domtes'>@domtes</a></Footer> */}
        </Layout>
      </ChatProvider>
    </StateProvider>
  );
}

export default App;
