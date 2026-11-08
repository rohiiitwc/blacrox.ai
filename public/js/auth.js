const AuthUI = (() => {
  const overlay = document.getElementById('authModalOverlay');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  const resetForm = document.getElementById('resetPasswordForm');
  
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const forgotLink = document.getElementById('forgotPasswordLink');
  const backToLoginLink = document.getElementById('backToLoginLink');
  const backToLoginFromResetLink = document.getElementById('backToLoginFromResetLink');

  const authError = document.getElementById('authError');
  const authSuccess = document.getElementById('authSuccess');

  function showError(msg) {
    if (authError) {
      authError.textContent = msg;
      authError.style.display = 'block';
    }
    if (authSuccess) authSuccess.style.display = 'none';
  }

  function showSuccess(msg) {
    if (authSuccess) {
      authSuccess.textContent = msg;
      authSuccess.style.display = 'block';
    }
    if (authError) authError.style.display = 'none';
  }

  function clearMessages() {
    if (authError) authError.style.display = 'none';
    if (authSuccess) authSuccess.style.display = 'none';
  }

  function showLoginTab() {
    clearMessages();
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'none';
    document.querySelector('.auth-tabs').style.display = 'flex';

    // Auto-fill last registered/logged-in email for seamless re-login
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    if (loginEmailInput) {
      const lastEmail = API.getLastLoginEmail();
      if (lastEmail && !loginEmailInput.value) {
        loginEmailInput.value = lastEmail;
      }
      if (loginEmailInput.value && loginPasswordInput) {
        setTimeout(() => loginPasswordInput.focus(), 60);
      }
    }
  }

  function showRegisterTab() {
    clearMessages();
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'none';
    document.querySelector('.auth-tabs').style.display = 'flex';
  }

  function showForgotTab() {
    clearMessages();
    document.querySelector('.auth-tabs').style.display = 'none';
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'block';
    resetForm.style.display = 'none';
  }

  function showResetTab(token = '') {
    clearMessages();
    document.querySelector('.auth-tabs').style.display = 'none';
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'block';
    const tokenInput = document.getElementById('resetTokenInput');
    if (tokenInput && token) tokenInput.value = token;
  }

  function openModal(message = '') {
    overlay.style.display = 'flex';
    showLoginTab();
    if (message) {
      showError(message);
    }
  }

  function closeModal() {
    overlay.style.display = 'none';
  }

  function init() {
    tabLogin.addEventListener('click', showLoginTab);
    tabRegister.addEventListener('click', showRegisterTab);
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotTab();
    });
    backToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginTab();
    });
    backToLoginFromResetLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginTab();
    });

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        return showError('Please complete all required fields.');
      }

      try {
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        const res = await API.login(email, password);
        btn.disabled = false;
        btn.textContent = 'LOGIN';

        if (res.success) {
          closeModal();
          window.dispatchEvent(new CustomEvent('user-logged-in', { detail: res.user }));
        }
      } catch (err) {
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = false;
        btn.textContent = 'LOGIN';
        showError(err.message || 'Incorrect email or password.');
      }
    });

    // Register Form Submit
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const fullName = document.getElementById('regFullName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;

      if (!fullName || !email || !password || !confirmPassword) {
        return showError('Please complete all required fields.');
      }

      if (password !== confirmPassword) {
        return showError('Passwords do not match.');
      }

      try {
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating Account...';

        const res = await API.register(fullName, email, password, confirmPassword);
        btn.disabled = false;
        btn.textContent = 'CREATE NEW ACCOUNT';

        if (res.success) {
          closeModal();
          window.dispatchEvent(new CustomEvent('user-logged-in', { detail: res.user }));
        }
      } catch (err) {
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.disabled = false;
        btn.textContent = 'CREATE NEW ACCOUNT';
        showError(err.message || 'Registration failed.');
      }
    });

    // Forgot Password Form Submit
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const email = document.getElementById('forgotEmail').value.trim();

      if (!email) {
        return showError('Please complete all required fields.');
      }

      try {
        const btn = forgotForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        const res = await API.forgotPassword(email);
        btn.disabled = false;
        btn.textContent = 'GENERATE RESET LINK';

        if (res.resetToken) {
          showSuccess('Reset token generated! For educational simulation convenience, redirecting to reset password...');
          setTimeout(() => {
            showResetTab(res.resetToken);
          }, 1500);
        } else {
          showSuccess(res.message);
        }
      } catch (err) {
        const btn = forgotForm.querySelector('button[type="submit"]');
        btn.disabled = false;
        btn.textContent = 'GENERATE RESET LINK';
        showError(err.message);
      }
    });

    // Reset Password Form Submit
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const token = document.getElementById('resetTokenInput').value.trim();
      const password = document.getElementById('newPasswordInput').value;
      const confirmPassword = document.getElementById('confirmNewPasswordInput').value;

      if (!token || !password || !confirmPassword) {
        return showError('Please complete all required fields.');
      }

      if (password !== confirmPassword) {
        return showError('Passwords do not match.');
      }

      try {
        const btn = resetForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Updating Password...';

        const res = await API.resetPassword(token, password, confirmPassword);
        btn.disabled = false;
        btn.textContent = 'UPDATE PASSWORD';

        showSuccess('Password reset successfully! Please log in with your new password.');
        setTimeout(() => {
          showLoginTab();
        }, 1800);
      } catch (err) {
        const btn = resetForm.querySelector('button[type="submit"]');
        btn.disabled = false;
        btn.textContent = 'UPDATE PASSWORD';
        showError(err.message);
      }
    });

    // Listen for session expiry event
    window.addEventListener('session-expired', (e) => {
      openModal(e.detail?.message || 'Your 2-hour session has completed. Please enter your password to continue.');
    });

    // Check URL params for reset token
    if (window.location.hash.includes('reset-password')) {
      const match = window.location.hash.match(/token=([^&]+)/);
      if (match && match[1]) {
        openModal();
        showResetTab(decodeURIComponent(match[1]));
      }
    }
  }

  return {
    init,
    openModal,
    closeModal
  };
})();

window.AuthUI = AuthUI;

