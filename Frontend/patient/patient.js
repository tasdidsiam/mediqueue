// These are still in development, just some mock api created for testing , not implemented in the 
//backend yet. Generated with Ai , not used yet


const API_BASE_URL = 'http://localhost:5000';

const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/auth/login',
  REGISTER: '/register',
  
  // Doctor endpoints
  DOCTORS: '/doctors',
  DOCTOR_BY_ID: (id) => `/doctors/${id}`,
  
  // Patient endpoints (to be implemented in backend)
  PATIENT_PROFILE: '/api/patient/profile',
  PATIENT_APPOINTMENTS: '/api/patient/appointments',
  PATIENT_TOKENS: '/api/patient/tokens',
  
  // Appointment endpoints (to be implemented)
  BOOK_APPOINTMENT: '/api/appointments/book',
  CANCEL_APPOINTMENT: (id) => `/api/appointments/${id}/cancel`,
  GET_APPOINTMENT: (id) => `/api/appointments/${id}`,
  UPDATE_APPOINTMENT: (id) => `/api/appointments/${id}`,
};

const PAGES = {
  DASHBOARD: 'Dashbord.html',
  SCHEDULE: 'userschedule.html',
  DOCTORS: 'Doctorlist.html',
  TOKENS: 'userstokenlist.html',
  LOGIN: '../loginpage/login-patient.html'
};

// =============================================================================
// AUTHENTICATION & USER MANAGEMENT 
// =============================================================================

class AuthManager {
  static TOKEN_KEY = 'token';
  static USER_KEY = 'user';
  static REFRESH_TOKEN_KEY = 'refreshToken';

 
  static isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Get stored token
   */
  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  static getUser() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Store authentication data
   */
  static setAuth(token, user, refreshToken = null) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * Clear authentication data and logout
   */
  static logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    window.location.href = PAGES.LOGIN;
  }

  /**
   * Update user profile data
   */
  static updateUser(userData) {
    const currentUser = this.getUser();
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
  }
}

// =============================================================================
// API REQUEST HANDLER
// =============================================================================

class APIClient {
  /**
   * Make HTTP request with authentication
   */
  static async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = AuthManager.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // Handle unauthorized
      if (response.status === 401) {
        AuthManager.logout();
        throw new Error('Session expired. Please login again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  static async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  static async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  static async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  static async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  static async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// =============================================================================
// PATIENT API SERVICES
// =============================================================================

class PatientService {
  /**
   * Get patient profile
   */
  static async getProfile() {
    try {
      return await APIClient.get(API_ENDPOINTS.PATIENT_PROFILE);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Return local user data as fallback
      return AuthManager.getUser();
    }
  }

  /**
   * Update patient profile
   */
  static async updateProfile(profileData) {
    try {
      const response = await APIClient.put(API_ENDPOINTS.PATIENT_PROFILE, profileData);
      AuthManager.updateUser(response.data);
      return response;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Get patient appointments
   */
  static async getAppointments() {
    try {
      return await APIClient.get(API_ENDPOINTS.PATIENT_APPOINTMENTS);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Return mock data if API not available
      return this.getMockAppointments();
    }
  }

  /**
   * Book new appointment
   */
  static async bookAppointment(appointmentData) {
    try {
      return await APIClient.post(API_ENDPOINTS.BOOK_APPOINTMENT, appointmentData);
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }

  /**
   * Cancel appointment
   */
  static async cancelAppointment(appointmentId) {
    try {
      return await APIClient.delete(API_ENDPOINTS.CANCEL_APPOINTMENT(appointmentId));
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Get patient tokens
   */
  static async getTokens() {
    try {
      return await APIClient.get(API_ENDPOINTS.PATIENT_TOKENS);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  }

  /**
   * Mock appointments data (fallback)
   */
  static getMockAppointments() {
    return [
      {
        id: 1,
        date: '2026-01-15',
        time: '10:00 AM',
        doctor: 'Dr. Mahmud Hasan',
        specialty: 'Neurologist',
        hospital: 'Charité – Universitätsmedizin Berlin',
        room: '101',
        status: 'confirmed',
        tokenNumber: 'TK-1015'
      },
      {
        id: 2,
        date: '2026-01-20',
        time: '02:30 PM',
        doctor: 'Dr. Nusrat Jahan',
        specialty: 'Gynecologist',
        hospital: 'Dhaka Medical College',
        room: '205',
        status: 'pending',
        tokenNumber: 'TK-2034'
      }
    ];
  }
}

// =============================================================================
// DOCTOR API SERVICES
// =============================================================================

class DoctorService {
  /**
   * Get all doctors
   */
  static async getAllDoctors() {
    try {
      const response = await APIClient.get(API_ENDPOINTS.DOCTORS);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Return mock data if API fails
      return this.getMockDoctors();
    }
  }

  /**
   * Get doctor by ID
   */
  static async getDoctorById(doctorId) {
    try {
      const response = await APIClient.get(API_ENDPOINTS.DOCTOR_BY_ID(doctorId));
      return response.data || response;
    } catch (error) {
      console.error('Error fetching doctor:', error);
      throw error;
    }
  }

  /**
   * Search doctors by specialty or name
   */
  static async searchDoctors(query) {
    try {
      const doctors = await this.getAllDoctors();
      return doctors.filter(doctor => 
        doctor.specialty?.toLowerCase().includes(query.toLowerCase()) ||
        doctor.name?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching doctors:', error);
      return [];
    }
  }

  /**
   * Mock doctors data (fallback)
   */
  static getMockDoctors() {
    return [
      {
        id: 1,
        name: 'Dr. Mahmud Hasan',
        specialty: 'Neurologist',
        hospital: 'Charité – Universitätsmedizin Berlin',
        room: '101',
        status: 'Available',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvZRzCOTmTpG-0zKoHeoNr8J-LeI_ihfZO3Q&s'
      },
      {
        id: 2,
        name: 'Dr. Nusrat Jahan',
        specialty: 'Gynecologist',
        hospital: 'Dhaka Medical College',
        room: '101',
        status: 'Available',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC2iQvAPNLkPLllOM8WVfxC7-sZoa7_SfU9g&s'
      },
      {
        id: 3,
        name: 'Dr. Habib Wahid',
        specialty: 'Dermatologist',
        hospital: 'University of California, San Francisco',
        room: '101',
        status: 'Available',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRAaLWQ_KF3MVg6COtkL1k58_ZkpU4q5jnyqQ&s'
      },
      {
        id: 4,
        name: 'Dr. Farzana Akter',
        specialty: 'Dermatologist',
        hospital: 'Sir Salimullah Medical College',
        room: '101',
        status: 'Available',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUU-MWryn48qmn_yPoXI_snQdFxPjNQmaf1A&s'
      },
      {
        id: 5,
        name: 'Dr. Shefaul Islam',
        specialty: 'Cardiologist',
        hospital: 'Charité – Universitätsmedizin Berlin',
        room: '101',
        status: 'Available',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRAaLWQ_KF3MVg6COtkL1k58_ZkpU4q5jnyqQ&s'
      }
    ];
  }
}

// =============================================================================
// NAVIGATION MANAGER
// =============================================================================

class NavigationManager {
  /**
   * Navigate to a page
   */
  static navigateTo(page) {
    window.location.href = page;
  }

  /**
   * Navigate to dashboard
   */
  static goToDashboard() {
    this.navigateTo(PAGES.DASHBOARD);
  }

  /**
   * Navigate to schedule
   */
  static goToSchedule() {
    this.navigateTo(PAGES.SCHEDULE);
  }

  /**
   * Navigate to doctors list
   */
  static goToDoctors() {
    this.navigateTo(PAGES.DOCTORS);
  }

  /**
   * Navigate to tokens list
   */
  static goToTokens() {
    this.navigateTo(PAGES.TOKENS);
  }

  /**
   * Logout and navigate to login
   */
  static logout() {
    if (confirm('Are you sure you want to logout?')) {
      AuthManager.logout();
    }
  }

  /**
   * Get current page name
   */
  static getCurrentPage() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    return page;
  }

  /**
   * Set active navigation tab
   */
  static setActiveTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('font-semibold', 'border-b-2', 'border-black');
      tab.classList.add('text-gray-600');
    });

    // Add active class to current tab
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('font-semibold', 'border-b-2', 'border-black');
      activeTab.classList.remove('text-gray-600');
    }
  }
}

// =============================================================================
// UI UTILITIES
// =============================================================================

class UIManager {
  /**
   * Show loading spinner
   */
  static showLoading(elementId = 'loading') {
    const loader = document.getElementById(elementId);
    if (loader) loader.classList.remove('hidden');
  }

  /**
   * Hide loading spinner
   */
  static hideLoading(elementId = 'loading') {
    const loader = document.getElementById(elementId);
    if (loader) loader.classList.add('hidden');
  }

  /**
   * Show toast notification
   */
  static showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      type === 'warning' ? 'bg-yellow-500' :
      'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Format date to readable string
   */
  static formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Format time to readable string
   */
  static formatTime(time) {
    return time;
  }

  /**
   * Initialize user info in header
   */
  static async initUserHeader() {
    const user = AuthManager.getUser();
    if (user) {
      const userNameEl = document.getElementById('userName');
      const userAvatarEl = document.getElementById('userAvatar');
      
      if (userNameEl) userNameEl.textContent = user.name || 'Patient';
      if (userAvatarEl && user.avatar) userAvatarEl.src = user.avatar;
    }
  }

  /**
   * Setup navigation event listeners
   */
  static setupNavigation() {
    // Dashboard navigation
    const dashboardBtn = document.querySelector('[data-nav="dashboard"]');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => NavigationManager.goToDashboard());
    }

    // Schedule navigation
    const scheduleBtn = document.querySelector('[data-nav="schedule"]');
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', () => NavigationManager.goToSchedule());
    }

    // Doctors navigation
    const doctorsBtn = document.querySelector('[data-nav="doctors"]');
    if (doctorsBtn) {
      doctorsBtn.addEventListener('click', () => NavigationManager.goToDoctors());
    }

    // Tokens navigation
    const tokensBtn = document.querySelector('[data-nav="tokens"]');
    if (tokensBtn) {
      tokensBtn.addEventListener('click', () => NavigationManager.goToTokens());
    }

    // Logout button
    const logoutBtn = document.querySelector('[data-nav="logout"]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => NavigationManager.logout());
    }
  }
}

// =============================================================================
// SESSION STORAGE MANAGER (for temporary data passing between pages)
// =============================================================================

class SessionManager {
  /**
   * Store data temporarily
   */
  static set(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Get temporary data
   */
  static get(key) {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Remove temporary data
   */
  static remove(key) {
    sessionStorage.removeItem(key);
  }

  /**
   * Clear all temporary data
   */
  static clear() {
    sessionStorage.clear();
  }

  /**
   * Store selected doctor for booking
   */
  static setSelectedDoctor(doctor) {
    this.set('selectedDoctor', doctor);
  }

  /**
   * Get selected doctor
   */
  static getSelectedDoctor() {
    return this.get('selectedDoctor');
  }

  /**
   * Store appointment for editing
   */
  static setEditingAppointment(appointment) {
    this.set('editingAppointment', appointment);
  }

  /**
   * Get appointment being edited
   */
  static getEditingAppointment() {
    return this.get('editingAppointment');
  }
}

// =============================================================================
// GLOBAL INITIALIZATION
// =============================================================================

/**
 * Initialize patient dashboard
 * Call this on page load
 */
function initPatientDashboard() {
  // Skip authentication check for now - implement later
  // if (!AuthManager.isAuthenticated()) {
  //   window.location.href = PAGES.LOGIN;
  //   return;
  // }

  // Initialize UI
  UIManager.initUserHeader();
  UIManager.setupNavigation();

  // Set active tab based on current page
  const currentPage = NavigationManager.getCurrentPage();
  if (currentPage.includes('Dashbord')) {
    NavigationManager.setActiveTab('dashboard');
  } else if (currentPage.includes('userschedule')) {
    NavigationManager.setActiveTab('schedule');
  } else if (currentPage.includes('Doctorlist')) {
    NavigationManager.setActiveTab('doctors');
  } else if (currentPage.includes('userstokenlist')) {
    NavigationManager.setActiveTab('tokens');
  }
}

// =============================================================================
// EXPORTS (for use in other files)
// =============================================================================

// Auto-initialize if document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPatientDashboard);
} else {
  initPatientDashboard();
}

// Export for use in other scripts
window.PatientDashboard = {
  AuthManager,
  APIClient,
  PatientService,
  DoctorService,
  NavigationManager,
  UIManager,
  SessionManager,
  API_ENDPOINTS,
  PAGES
};
