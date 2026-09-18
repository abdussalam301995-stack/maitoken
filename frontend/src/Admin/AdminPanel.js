import React from 'react';

function AdminPanel({ back }) {
  return (
    <div className="adminPanel">
      <header className="adminHeader">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
        >
          ←
        </button>

        <div>
          <small>MAI NETWORK</small>
          <h1>Admin Control Center</h1>
        </div>
      </header>

      <main className="adminContent">
        <div className="adminWelcome">
          <span>ADMIN ACCESS</span>
          <h2>Control Center Ready</h2>
          <p>
            Secure MAI Network administration panel.
          </p>
        </div>
      </main>
    </div>
  );
}

export default AdminPanel;