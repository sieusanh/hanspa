// Configuration
// const HOSTNAME = "hanspa"
const API_URL = `${window.location.origin}/api`;

// const API_URL = `http://${HOSTNAME}:3456/api`;
// const API_URL = `http://${HOSTNAME}:3456`;
// const API_URL = `http://localhost:3456/api`;
let services = {};
let selectedBookingId = null;
let currentDate = new Date().toISOString().split('T')[0];
let datePicker = null;
const THEME_STORAGE_KEY = 'hanspa-theme';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeDateInput();
  loadServices();
  loadBookings();
  setupEventListeners();
  
  // Auto-refresh every 30 seconds
  setInterval(loadBookings, 30000);
});

// Hide year selector in Flatpickr (calendar uses current year only)
function hideFlatpickrYear(instance) {
  if (!instance) return;
  const el = instance.currentYearElement;
  if (el) {
    el.style.display = 'none';
    const wrap = el.closest('.numInputWrapper');
    if (wrap) wrap.style.display = 'none';
  }
}

// Initialize date input with today's date (Flatpickr for Vietnamese locale on mobile)
function initializeDateInput() {
  const dateInput = document.getElementById('dateInput');
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  if (currentDate < yearStart || currentDate > yearEnd) {
    currentDate = new Date().toISOString().split('T')[0];
  }
  dateInput.value = currentDate;
  if (typeof flatpickr !== 'undefined') {
    datePicker = flatpickr(dateInput, {
      locale: 'vn',
      dateFormat: 'Y-m-d',
      defaultDate: currentDate,
      minDate: yearStart,
      maxDate: yearEnd,
      onReady(selectedDates, dateStr, instance) {
        hideFlatpickrYear(instance);
      },
      onOpen() {
        hideFlatpickrYear(datePicker);
      },
      onChange(selectedDates, dateStr) {
        currentDate = dateStr;
        loadBookings();
      }
    });
  } else {
    dateInput.addEventListener('change', (e) => {
      currentDate = e.target.value;
      loadBookings();
    });
  }
}

function isMobile() {
  return window.innerWidth < 768;
}

// Load services from API
async function loadServices() {
  try {
    const response = await fetch(`${API_URL}/services`);
    services = await response.json();

    const serviceSelect = document.getElementById('serviceSelect');
    serviceSelect.innerHTML = '';

    const showSubName = isMobile();
    Object.keys(services).forEach(serviceName => {
      const option = document.createElement('option');
      option.value = serviceName;
      option.textContent = showSubName && services[serviceName].subName
        ? services[serviceName].subName
        : serviceName;
      serviceSelect.appendChild(option);
    });

    toggleExtraPriceVisibility();
  } catch (error) {
    console.error('Error loading services:', error);
    showNotification('Lỗi tải dịch vụ', 'error');
  }
}

const EXTRA_SERVICE_LABEL = 'Dịch vụ thêm (15p)';

function toggleExtraPriceVisibility() {
  const serviceSelect = document.getElementById('serviceSelect');
  const extraPriceGroup = document.getElementById('extraPriceGroup');
  extraPriceGroup.style.display = serviceSelect.value === EXTRA_SERVICE_LABEL ? 'block' : 'none';
}

// Load bookings for selected date
let loadBookingsInProgress = false;
async function loadBookings() {
  // Prevent concurrent requests
  if (loadBookingsInProgress) {
    return;
  }
  loadBookingsInProgress = true;
  
  try {
    const fetchUrl = `${API_URL}/bookings/${currentDate}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const bookings = await response.json();

    displayBookings(bookings);
    drawTimeline(bookings);

  } catch (error) {
    console.error('Error loading bookings:', error);
    console.log('Loi loadBookings ', error);
    // Only show notification for unexpected errors, not network failures during auto-refresh
    // Silent fail on auto-refresh network errors to avoid spamming user
    if (error.message !== 'Failed to fetch') {
      showNotification('Lỗi tải danh sách', 'error');
    }
  } finally {
    loadBookingsInProgress = false;
  }
}

// Display bookings in tables
function displayBookings(bookings) {
  const bedInTable = document.getElementById('bedInTable').querySelector('tbody');
  const bedMiddleTable = document.getElementById('bedMiddleTable').querySelector('tbody');
  const bedOutTable = document.getElementById('bedOutTable').querySelector('tbody');
  
  bedInTable.innerHTML = '';
  bedMiddleTable.innerHTML = '';
  bedOutTable.innerHTML = '';
  
  const now = new Date();
console.log('========= bookings ', bookings)
  bookings.forEach(booking => {
    const row = createBookingRow(booking, now);
    
    if (booking.bed === 'Giường trong') {
      bedInTable.appendChild(row);
    } else if (booking.bed === 'Giường giữa') {
      bedMiddleTable.appendChild(row);
    } else {
      bedOutTable.appendChild(row);
    }
  });
  
  // Show empty state if no bookings
  if (bookings.filter(b => b.bed === 'Giường trong').length === 0) {
    bedInTable.innerHTML = '<tr><td colspan="5" class="empty-state">Chưa có lịch hẹn</td></tr>';
  }
  
  if (bookings.filter(b => b.bed === 'Giường giữa').length === 0) {
    bedMiddleTable.innerHTML = '<tr><td colspan="5" class="empty-state">Chưa có lịch hẹn</td></tr>';
  }
  
  if (bookings.filter(b => b.bed === 'Giường ngoài').length === 0) {
    bedOutTable.innerHTML = '<tr><td colspan="5" class="empty-state">Chưa có lịch hẹn</td></tr>';
  }
}

// Create booking table row
function createBookingRow(booking, now) {
  const row = document.createElement('tr');
  row.dataset.bookingId = booking.id;
  
  const startTime = new Date(booking.start);
  const endTime = new Date(booking.end);
  
  // Determine row class based on time
  if (startTime <= now && now < endTime) {
    row.classList.add('doing');
  } else if (now >= endTime) {
    row.classList.add('done');
  }
  
  const serviceDisplay = isMobile() && services[booking.service]?.subName
    ? services[booking.service].subName
    : booking.service;
  row.innerHTML = `
    <td>${booking.customer}</td>
    <td>${serviceDisplay}</td>
    <td>${formatTime(startTime)} - ${formatTime(endTime)}</td>
    <td>${booking.note || '-'}</td>
  `;
  
  row.addEventListener('click', () => selectBooking(booking, row));
  
  return row;
}

// Select booking
function selectBooking(booking, row) {
  // Remove previous selection
  document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected'));
  
  // Add selection to clicked row
  row.classList.add('selected');
  selectedBookingId = booking.id;
  
  // Populate form
  document.getElementById('customerName').value = booking.customer;
  document.getElementById('serviceSelect').value = booking.service;
  document.getElementById('bedSelect').value = booking.bed;
  document.getElementById('note').value = booking.note || '';
  if (booking.service === EXTRA_SERVICE_LABEL) {
    document.getElementById('extraPriceInput').value = booking.price || 0;
  }
  toggleExtraPriceVisibility();

  const startTime = new Date(booking.start);
  document.getElementById('hourInput').value = startTime.getHours();
  document.getElementById('minuteInput').value = startTime.getMinutes();
  
  // Show delete button
  document.getElementById('deleteBtn').style.display = 'block';
}

// Format time
function formatTime(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('serviceSelect').addEventListener('change', toggleExtraPriceVisibility);
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Form submit
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveBooking();
  });
  
  // Delete button
  document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (selectedBookingId && confirm('Xác nhận xoá lịch này?')) {
      await deleteBooking(selectedBookingId);
    }
  });
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const shouldUseDark = savedTheme === 'dark';
  applyTheme(shouldUseDark ? 'dark' : 'light');
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateThemeToggleLabel(isDark);
}

function updateThemeToggleLabel(isDark) {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) {
    return;
  }
  themeToggleBtn.textContent = isDark ? '☀ Light' : '🌙 Dark';
  themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  applyTheme(isDark ? 'light' : 'dark');
  loadBookings();
}

// Save booking
async function saveBooking() {
  const customerName = document.getElementById('customerName').value.trim();
  const serviceName = document.getElementById('serviceSelect').value;
  const bed = document.getElementById('bedSelect').value;
  const note = document.getElementById('note').value.trim();
  const hour = parseInt(document.getElementById('hourInput').value);
  const minute = parseInt(document.getElementById('minuteInput').value);
  
  if (!customerName) {
    showNotification('Vui lòng nhập tên khách', 'error');
    return;
  }
  
  const service = services[serviceName];
  const duration = service.duration;
  const price = serviceName === EXTRA_SERVICE_LABEL
    ? (parseInt(document.getElementById('extraPriceInput').value, 10) || 0)
    : service.price;

  const startDate = new Date(currentDate);
  startDate.setHours(hour, minute, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + duration);

  const bookingData = {
    customer: customerName,
    service: serviceName,
    bed: bed,
    note: note,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    price
  };

  const isUpdate = selectedBookingId != null;
  const url = isUpdate ? `${API_URL}/bookings/${selectedBookingId}` : `${API_URL}/bookings`;
  const method = isUpdate ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(isUpdate ? 'Đã cập nhật lịch hẹn!' : 'Đã lưu lịch hẹn!', 'success');
      resetForm();
      loadBookings();
    } else {
      showNotification(result.error || 'Lỗi khi lưu', 'error');
    }
  } catch (error) {
    console.log('===== loigi ', error)
    console.error('Error saving booking:', error);
    showNotification('Lỗi kết nối', 'error');
  }
}

// Delete booking
async function deleteBooking(id) {
  try {
    const response = await fetch(`${API_URL}/bookings/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showNotification('Đã xoá lịch hẹn', 'success');
      resetForm();
      loadBookings();
    } else {
      showNotification('Lỗi khi xoá', 'error');
    }
  } catch (error) {
    console.error('Error deleting booking:', error);
    showNotification('Lỗi kết nối', 'error');
  }
}

// Reset form
function resetForm() {
  document.getElementById('bookingForm').reset();
  if (datePicker) {
    datePicker.setDate(currentDate, false);
  } else {
    document.getElementById('dateInput').value = currentDate;
  }
  document.getElementById('note').value = '';
  document.getElementById('extraPriceInput').value = 0;
  document.getElementById('hourInput').value = 8;
  document.getElementById('minuteInput').value = 0;
  document.getElementById('deleteBtn').style.display = 'none';
  selectedBookingId = null;
  toggleExtraPriceVisibility();
  
  // Remove selection from rows
  document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected'));
}

// Draw timeline (fixed width for horizontal scroll on mobile)
const TIMELINE_WIDTH = 1150;
const TIMELINE_HEIGHT = 260;

function drawTimeline(bookings) {
  const canvas = document.getElementById('timelineCanvas');
  const ctx = canvas.getContext('2d');
  const computedStyles = getComputedStyle(document.body);
  const timelineLabelColor = computedStyles.getPropertyValue('--muted-text').trim() || '#666';
  const timelineBedColor = computedStyles.getPropertyValue('--text-color').trim() || '#333';
  const timelineGridColor = computedStyles.getPropertyValue('--grid-line').trim() || '#ddd';
  const timelineOngoingColor = document.body.classList.contains('dark-mode') ? '#2f6d46' : '#4CAF50';
  const timelineDoneColor = document.body.classList.contains('dark-mode') ? '#6b5a2a' : '#FFD966';
  
  canvas.width = TIMELINE_WIDTH;
  canvas.height = TIMELINE_HEIGHT;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const hourWidth = 70;
  const startX = 100;
  const now = new Date();
  
  // Draw time grid (8 AM to 11 PM)
  ctx.font = '12px Arial';
  ctx.fillStyle = timelineLabelColor;
  
  for (let h = 8; h <= 22; h++) {
    const x = startX + (h - 8) * hourWidth;
    ctx.fillText(`${h}:00`, x - 15, 20);
    
    // Draw vertical line
    ctx.strokeStyle = timelineGridColor;
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, canvas.height - 10);
    ctx.stroke();
  }
  
  // Draw beds
  const beds = ['Giường trong', 'Giường giữa', 'Giường ngoài'];
  
  beds.forEach((bed, index) => {
    const y = 50 + index * 70;
    
    // Draw bed label
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = timelineBedColor;
    ctx.fillText(bed, 10, y + 20);
    
    // Draw bookings for this bed
    const bedBookings = bookings.filter(b => b.bed === bed);
    
    bedBookings.forEach(booking => {
      const startTime = new Date(booking.start);
      const endTime = new Date(booking.end);
      
      // Calculate positions
      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
      const endHour = endTime.getHours() + endTime.getMinutes() / 60;
      
      const x1 = startX + (startHour - 8) * hourWidth;
      const x2 = startX + (endHour - 8) * hourWidth;
      const width = x2 - x1;
      
      // Determine color
      let color = timelineOngoingColor;
      if (startTime <= now && now < endTime) {
        color = timelineOngoingColor; // Ongoing
      } else if (now >= endTime) {
        color = timelineDoneColor; // Completed
      }
      
      // Draw booking rectangle
      ctx.fillStyle = color;
      ctx.fillRect(x1, y, width, 40);
      
      // Draw border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y, width, 40);
      
      // Draw text
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      const text1 = booking.customer;
      const text2 = `${formatTime(startTime)}-${formatTime(endTime)}`;
      
      ctx.fillText(text1, x1 + 5, y + 18);
      ctx.fillText(text2, x1 + 5, y + 32);
    });
  });
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  if (type === 'success') {
    notification.style.background = '#4CAF50';
  } else if (type === 'error') {
    notification.style.background = '#F44336';
  } else if (type === 'warning') {
    notification.style.background = '#FF9800';
  } else {
    notification.style.background = '#2196F3';
  }
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
