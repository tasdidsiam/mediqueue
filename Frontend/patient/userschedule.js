const SCHEDULE_API_BASE_URL = "https://mediqueue-xt8k.onrender.com";

let currentDate = new Date();
let selectedDate = new Date();
let appointments = []; // Will be fetched from API

// Fetch patient's appointments from API
async function fetchAppointments() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      window.location.href = '../loginpage/login-patient.html';
      return;
    }

    console.log('Fetching patient appointments...');
    const response = await fetch(`${SCHEDULE_API_BASE_URL}/patients/my-tokens`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.clear();
        window.location.href = '../loginpage/login-patient.html';
        return;
      }
      throw new Error(`Failed to fetch appointments: ${response.status}`);
    }

    const result = await response.json();
    console.log('API Response:', result);

    if (result.success && result.data) {
      // Transform API data to calendar format
      appointments = result.data.map(token => {
        // Format times
        const formatTime = (dateStr) => {
          if (!dateStr) return 'TBD';
          const date = new Date(dateStr);
          return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
        };

        return {
          id: token._id,
          date: token.appointmentDate
  ? token.appointmentDate.split('T')[0]
  : formatDate(new Date()),
          scheduleStartTime: formatTime(token.scheduleStartTime),
          scheduleEndTime: formatTime(token.scheduleEndTime),
          appointmentStartTime: formatTime(token.appointmentStartTime),
          appointmentEndTime: formatTime(token.appointmentEndTime),
          doctor: token.doctor?.name || 'Unknown Doctor',
          specialty: token.doctor?.specialization || token.doctor?.specialty || 'General',
          hospital: token.doctor?.hospital || 'Not specified',
          status: token.tokenStatus === 'queued' ? 'confirmed' : token.tokenStatus,
          tokenNumber: token.tokenNumber,
          appointmentTitle: token.appointmentTitle || 'Appointment',
          appointmentStatus: token.appointmentStatus,
          doctorId: token.doctor?._id
        };
      });
      
      console.log('Processed appointments:', appointments);
      initCalendar();
    } else {
      console.log('No appointments found');
      appointments = [];
      initCalendar();
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    alert('Failed to load appointments. Please try again.');
    appointments = [];
    initCalendar();
  }
}

// Initialize calendar
function initCalendar() {
  updateCalendarHeader();
  renderCalendar();
  displayAppointments(selectedDate);
}

// Update calendar header
function updateCalendarHeader() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = months[currentDate.getMonth()];
  document.getElementById('currentYear').textContent = currentDate.getFullYear();
}

// Render calendar days
function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const today = new Date();
  const todayStr = formatDate(today);

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    calendarGrid.appendChild(emptyCell);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const hasAppointment = appointments.some(apt => apt.date === dateStr);
    
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day text-center p-2 rounded-lg cursor-pointer ';
    
    if (dateStr === todayStr) {
      dayCell.className += ' today-date font-bold';
    } else if (hasAppointment) {
      dayCell.className += ' has-appointment font-semibold';
    } else {
      dayCell.className += ' bg-gray-100 hover:bg-gray-200';
    }
    
    if (dateStr === formatDate(selectedDate)) {
      dayCell.style.border = '3px solid #fbbf24';
    }
    
    dayCell.innerHTML = `
      <div class="text-base font-medium">${day}</div>
      ${hasAppointment ? '<div class="text-xs">●</div>' : ''}
    `;
    
    dayCell.onclick = () => selectDate(date);
    calendarGrid.appendChild(dayCell);
  }
}

// Select a date
function selectDate(date) {
  selectedDate = date;
  renderCalendar();
  displayAppointments(date);
}

// Display appointments for selected date
function displayAppointments(date) {
  const dateStr = formatDate(date);
  const appointmentsList = document.getElementById('appointmentsList');
  const noAppointments = document.getElementById('noAppointments');
  const selectedDateEl = document.getElementById('selectedDate');
  
  selectedDateEl.textContent = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const dayAppointments = appointments.filter(apt => apt.date === dateStr);

  if (dayAppointments.length === 0) {
    appointmentsList.classList.add('hidden');
    noAppointments.classList.remove('hidden');
    return;
  }

  appointmentsList.classList.remove('hidden');
  noAppointments.classList.add('hidden');
  
  appointmentsList.innerHTML = dayAppointments.map(apt => {
    // Determine status display
    let statusClass, statusText, borderColor;
    switch(apt.status) {
      case 'queued':
      case 'confirmed':
        statusClass = 'bg-blue-100 text-blue-800';
        statusText = '⏳ Queued';
        borderColor = 'border-blue-500';
        break;
      case 'completed':
        statusClass = 'bg-green-100 text-green-800';
        statusText = '✓ Completed';
        borderColor = 'border-green-500';
        break;
      case 'skipped':
        statusClass = 'bg-red-100 text-red-800';
        statusText = '✗ Skipped';
        borderColor = 'border-red-500';
        break;
      case 'late_penalty':
        statusClass = 'bg-orange-100 text-orange-800';
        statusText = '⚠ Late';
        borderColor = 'border-orange-500';
        break;
      default:
        statusClass = 'bg-gray-100 text-gray-800';
        statusText = apt.status;
        borderColor = 'border-gray-500';
    }

    return `
    <div class="appointment-card bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-l-4 ${borderColor} fade-in">
      <div class="flex items-start justify-between">
        <div class="flex gap-4 flex-1">
          <div class="bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-md">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctor)}&size=64&background=6366f1&color=fff" 
                 class="w-16 h-16 rounded-full" 
                 alt="${apt.doctor}" />
          </div>
          
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-800">${apt.doctor}</h3>
            <p class="text-sm text-gray-600 mt-1">${apt.specialty}</p>
            ${apt.appointmentTitle ? `<p class="text-sm text-purple-600 font-semibold mt-1">📋 ${apt.appointmentTitle}</p>` : ''}
            <p class="text-xs text-gray-500 mt-1">🏥 ${apt.hospital}</p>
            
            <div class="mt-4 bg-white rounded-lg p-3 space-y-2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs text-gray-500 font-semibold">Your Time Slot</p>
                  <p class="text-sm font-bold text-purple-600">${apt.scheduleStartTime} - ${apt.scheduleEndTime}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-semibold">Appointment Duration</p>
                  <p class="text-sm font-bold text-gray-700">${apt.appointmentStartTime} - ${apt.appointmentEndTime}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-2 pt-2 border-t">
                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>
                </svg>
                <span class="text-lg font-mono font-bold text-purple-700">Token #${apt.tokenNumber}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="text-right">
          <span class="status-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
            ${statusText}
          </span>
          
          <div class="mt-4 space-y-2">
            <button onclick="viewDetails('${apt.id}')" class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition">
              View Details
            </button>
            ${apt.status === 'queued' || apt.status === 'confirmed' ? `
            <button onclick="cancelAppointment('${apt.id}')" class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition">
              Cancel
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `}).join('');
}

// Navigate to previous month
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  initCalendar();
}

// Navigate to next month
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  initCalendar();
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// View appointment details
function viewDetails(appointmentId) {
  const appointment = appointments.find(apt => apt.id === appointmentId);
  if (appointment) {
    const details = `
═══════════════════════════════════════
      APPOINTMENT DETAILS
═══════════════════════════════════════

📋 Appointment: ${appointment.appointmentTitle}
👨‍⚕️ Doctor: ${appointment.doctor}
🏥 Specialty: ${appointment.specialty}
🏥 Hospital: ${appointment.hospital}

═══════════════════════════════════════
      TIME DETAILS
═══════════════════════════════════════

📅 Date: ${appointment.date}

⏰ Your Time Slot:
   ${appointment.scheduleStartTime} - ${appointment.scheduleEndTime}

🕐 Full Appointment Duration:
   ${appointment.appointmentStartTime} - ${appointment.appointmentEndTime}

═══════════════════════════════════════
      TOKEN INFORMATION
═══════════════════════════════════════

🎫 Token Number: #${appointment.tokenNumber}
📊 Status: ${appointment.status.toUpperCase()}

═══════════════════════════════════════
    `.trim();
    
    alert(details);
  }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      window.location.href = '../loginpage/login-patient.html';
      return;
    }

    // TODO: Implement cancel appointment API endpoint
    alert('Cancel appointment feature coming soon!');
    
    // After implementing API:
    // const response = await fetch(`${API_BASE_URL}/patients/cancel-appointment/${appointmentId}`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    //
    // if (response.ok) {
    //   alert('Appointment cancelled successfully!');
    //   await fetchAppointments(); // Reload appointments
    // }
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    alert('Failed to cancel appointment. Please try again.');
  }
}

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../loginpage/login-patient.html';
  }
}

// Load user info
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) {
    // Update UI with user info if needed
  }
}

// Initialize on page load
// Render calendar immediately so the grid is visible.
initCalendar();

document.addEventListener('DOMContentLoaded', async function() {
  loadUserInfo();
  await fetchAppointments(); // Fetch real data from API
});
