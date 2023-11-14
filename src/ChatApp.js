import React, { useState, useEffect } from 'react';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws');
    const client = Stomp.over(socket);

    const onConnect = () => {
      console.log("Connected");

      // Fetch and update the list of users
      client.subscribe('/app/users', (userList) => {
        const users = JSON.parse(userList.body);
        console.log("Received users:", users);
        setUsers(users);
      });

      // Notify the server that the user has entered the chat
      client.send('/app/enter', {}, JSON.stringify({ nickname }));

      // Subscribe to the public message topic
      client.subscribe('/topic/messages', (message) => {
        const receivedMessage = JSON.parse(message.body);
        setMessages((prevMessages) => [...prevMessages, receivedMessage]);
      });

      // Subscribe to the user-specific queue for private messages
      client.subscribe('/user/queue/private', (message) => {
        const receivedMessage = JSON.parse(message.body);
        setMessages((prevMessages) => [...prevMessages, receivedMessage]);
      });
    };

    const onError = (error) => {
      console.error("Error during connection:", error);
    };

    if (showChat) {
      client.connect({}, onConnect, onError);
      setStompClient(client);
    }

    return () => {
      if (client.connected) {
        client.disconnect();
      }
    };
  }, [showChat, nickname]);

  const handleNicknameChange = (event) => {
    setNickname(event.target.value);
  };

  const handleEnterChat = () => {
    if (nickname.trim()) {
      setShowChat(true);
    }
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  const sendMessage = () => {
    if (stompClient && stompClient.connected && message.trim()) {
      const chatMessage = {
        nickname,
        content: message,
      };

      // Check if the message is a private message
      if (selectedUser) {
        chatMessage.recipient = selectedUser;
        stompClient.send(`/app/private/${selectedUser}`, {}, JSON.stringify(chatMessage));
      } else {
        stompClient.send('/app/chat', {}, JSON.stringify(chatMessage));
      }

      setMessage('');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {!showChat ? (
        <div>
          <h2>Welcome to the Chat App</h2>
          <input
            placeholder="Enter your nickname"
            value={nickname}
            onChange={handleNicknameChange}
            autoFocus
          />
          <button onClick={handleEnterChat}>Enter</button>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh' }}>
          <div style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px' }}>
            <h2>Users</h2>
            <ul>
              {users.map((user) => (
                <li key={user} onClick={() => handleUserClick(user)} style={{ cursor: 'pointer', padding: '5px' }}>
                  {user}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: 1, padding: '10px' }}>
            <div style={{ height: '80%', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
              {messages.map((msg, index) => (
                <div key={index}>
                  <strong>{msg.nickname}: </strong>
                  {msg.content}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
              <input
                placeholder="Type a message"
                value={message}
                onChange={handleMessageChange}
                style={{ flex: 1, marginRight: '10px' }}
              />
              <button onClick={sendMessage} disabled={!message.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
