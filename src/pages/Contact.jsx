import React from 'react';

const Contact = () => {
  return (
    <div className="gradient-wrapper">
      <div className="star"></div>
      <div style={styles.container}>
        <h1 style={styles.title}>Contact Us</h1>

        <div style={styles.form}>
          <p style={styles.label}>
            We’d love to hear from you. Click below to email us directly:
          </p>

          <a
            href="mailto:customer.service3252@gmail.com?subject=Contact%20from%20MoonLight"
            style={styles.button}
          >
            Send Us an Email
          </a>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    fontFamily: 'Arial, sans-serif',
    minHeight: '100vh',
    color: 'white',
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: '2rem',
    fontSize: '2.5rem',
    color: 'white',
  },
  form: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '2rem',
  },
  label: {
    display: 'block',
    marginBottom: '1.5rem',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: 'white',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '0.9rem',
    backgroundColor: '#000000ff',
    color: '#fff',
    fontSize: '1.1rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.3s ease',
  },
};

export default Contact;