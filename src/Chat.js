import React, { useState, useEffect } from 'react';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws');
    const client = Stomp.over(socket);

    const onConnect = () => {
      console.log("Connected");
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

    client.connect({}, onConnect, onError);

    setStompClient(client);

    return () => {
      if (client.connected) {
        client.disconnect();
      }
    };
  }, []);

  const handleNicknameChange = (event) => {
    setNickname(event.target.value);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const sendMessage = () => {
    if (stompClient && stompClient.connected && message.trim()) {
      const chatMessage = {
        nickname,
        content: message,
      };

      // Check if the message is a private message
      const isPrivate = message.startsWith('/private');

      if (isPrivate) {
        const recipient = message.split(' ')[1];
        stompClient.send(`/app/private/${recipient}`, {}, JSON.stringify(chatMessage));
      } else {
        stompClient.send('/app/chat', {}, JSON.stringify(chatMessage));
      }

      setMessage('');
    }
  };

  return (
    <div>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg.content}</li>
        ))}
      </ul>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          placeholder="Enter your nickname"
          value={nickname}
          onChange={handleNicknameChange}
          autoFocus
        />
        <input
          placeholder="Type a message"
          value={message}
          onChange={handleMessageChange}
          fullWidth
        />
        <button onClick={sendMessage} disabled={!message.trim()}>
          send
        </button>
      </div>
    </div>
  );
};

export default Chat;
