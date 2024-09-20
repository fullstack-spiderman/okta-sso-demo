import React, { useState, useEffect } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { Security, SecureRoute, LoginCallback } from '@okta/okta-react';
import { BrowserRouter as Router, Route, Link, useHistory } from 'react-router-dom';

const oktaAuth = new OktaAuth({
  issuer: 'https://{YOUR_OKTA_DOMAIN}/oauth2/default',
  clientId: '{YOUR_CLIENT_ID}',
  redirectUri: window.location.origin + '/login/callback'
});

const App = () => {
  const history = useHistory();

  const restoreOriginalUri = async (_oktaAuth, originalUri) => {
    history.replace(toRelativeUrl(originalUri || '/', window.location.origin));
  };

  return (
    <Router>
      <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
        <div>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/items">Items</Link></li>
            </ul>
          </nav>

          <Route path="/" exact component={Home} />
          <SecureRoute path="/items" component={ItemList} />
          <Route path="/login/callback" component={LoginCallback} />
        </div>
      </Security>
    </Router>
  );
};

const Home = () => {
  const { oktaAuth, authState } = useOktaAuth();

  if (!authState) return <div>Loading...</div>;

  const login = async () => oktaAuth.signInWithRedirect();
  const logout = async () => oktaAuth.signOut();

  return (
    <div>
      <h1>Welcome to CRUD App</h1>
      {authState.isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={login}>Login</button>
      )}
    </div>
  );
};

const ItemList = () => {
  const { authState } = useOktaAuth();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const response = await fetch('http://localhost:8000/items/', {
      headers: {
        'Authorization': `Bearer ${authState.accessToken.accessToken}`
      }
    });
    const data = await response.json();
    setItems(data);
  };

  const createItem = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:8000/items/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.accessToken.accessToken}`
      },
      body: JSON.stringify(newItem)
    });
    setNewItem({ name: '', description: '' });
    fetchItems();
  };

  const deleteItem = async (id) => {
    await fetch(`http://localhost:8000/items/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authState.accessToken.accessToken}`
      }
    });
    fetchItems();
  };

  return (
    <div>
      <h2>Items</h2>
      <form onSubmit={createItem}>
        <input
          type="text"
          placeholder="Name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
        />
        <button type="submit">Add Item</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} - {item.description}
            <button onClick={() => deleteItem(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
