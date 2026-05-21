/**
 * ================================================================
 * Le'Monet Art Café — Google Apps Script v2
 * Webhook flow: Booking → Sheet → Sepay webhook → Sheet update
 * ================================================================
 *
 * HƯỚNG DẪN SAU KHI UPDATE CODE NÀY:
 * 1. Vào Apps Script → Deploy → Manage deployments
 * 2. Bấm ✏️ Edit trên deployment hiện tại
 * 3. Version → chọn "New version"
 * 4. Bấm Deploy → URL giữ nguyên ✅
 *
 * CẤU HÌNH SEPAY WEBHOOK:
 * 1. Vào my.sepay.vn → Cài đặt → Webhook
 * 2. URL: [URL Apps Script của bạn]
 * 3. Bật webhook → Save
 * ================================================================
 */

const SHEET_NAME   = 'Đặt Cọc';
const DEPOSIT_AMOUNT = 100000; // VNĐ — số tiền cọc tối thiểu

// ── doPost: nhận 2 loại request ──────────────────────────────
function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    // Phân biệt booking mới vs Sepay webhook
    if (data.type === 'booking') {
      return handleBooking(data);
    } else {
      return handleSePayWebhook(data);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── doGet: frontend poll ?ref=ORDERREF ───────────────────────
function doGet(e) {
  const ref = e.parameter && e.parameter.ref;
  if (!ref) {
    return jsonResponse({ status: 'ok', service: "Le'Monet Booking Sheet v2" });
  }

  const sheet = getOrCreateSheet();
  const data  = sheet.getDataRange().getValues();

  // Tìm hàng có mã đặt chỗ = ref (cột B = index 1)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toUpperCase() === ref.trim().toUpperCase()) {
      const status = String(data[i][11]); // cột L = Trạng thái
      const paid   = status.includes('✅');
      return jsonResponse({
        paid,
        ref,
        status,
        name:  data[i][2],
        date:  data[i][4],
        time:  data[i][5],
        room:  data[i][6],
        pkg:   data[i][7],
      });
    }
  }

  // Chưa tìm thấy ref này
  return jsonResponse({ paid: false, ref, status: 'not_found' });
}

// ── Ghi booking mới vào Sheet ────────────────────────────────
function handleBooking(data) {
  const sheet = getOrCreateSheet();

  // Tạo header nếu chưa có
  if (sheet.getLastRow() === 0) {
    const header = [
      'Thời gian đăng ký', 'Mã đặt chỗ', 'Tên', 'Điện thoại',
      'Ngày thuê', 'Giờ bắt đầu', 'Phòng', 'Gói',
      'Số tiền cọc', 'Mã GD Sepay', 'Thời gian GD', 'Trạng thái'
    ];
    sheet.appendRow(header);
    const hr = sheet.getRange(1, 1, 1, 12);
    hr.setFontWeight('bold');
    hr.setBackground('#1A3A4A');
    hr.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // Kiểm tra ref đã tồn tại chưa (tránh duplicate)
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (String(existing[i][1]).trim() === String(data.ref).trim()) {
      return jsonResponse({ success: true, duplicate: true });
    }
  }

  sheet.appendRow([
    new Date(),
    data.ref   || '',
    data.name  || '',
    data.phone || '',
    data.date  || '',
    data.time  || '',
    data.room  || '',
    data.pkg   || '',
    DEPOSIT_AMOUNT,
    '', // Mã GD Sepay — chờ webhook
    '', // Thời gian GD — chờ webhook
    'Chờ thanh toán ⏳'
  ]);

  sheet.autoResizeColumns(1, 12);
  return jsonResponse({ success: true });
}

// ── Xử lý webhook từ Sepay ───────────────────────────────────
function handleSePayWebhook(data) {
  // Sepay webhook payload fields:
  // data.id, data.transferAmount / data.amountIn,
  // data.description / data.transaction_content / data.content,
  // data.transactionDate / data.transaction_date

  const content = String(
    data.description || data.transaction_content || data.content || ''
  ).toUpperCase();

  const amount = parseFloat(
    data.transferAmount || data.amountIn || data.amount_in || 0
  );

  // Không đủ số tiền → bỏ qua
  if (amount < DEPOSIT_AMOUNT) {
    return jsonResponse({ success: false, reason: 'amount_insufficient' });
  }

  const sheet = getOrCreateSheet();
  const rows  = sheet.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    const ref = String(rows[i][1]).trim().toUpperCase();
    if (ref && content.includes(ref)) {
      // Tìm thấy! Update hàng này
      const rowNum = i + 1;
      sheet.getRange(rowNum, 10).setValue(data.id || '');                         // Mã GD
      sheet.getRange(rowNum, 11).setValue(data.transactionDate || data.transaction_date || new Date()); // Thời gian GD
      sheet.getRange(rowNum, 12).setValue('Đã thanh toán ✅');                   // Trạng thái

      // Highlight hàng xanh
      sheet.getRange(rowNum, 1, 1, 12).setBackground('#d4edda');
      updated = true;
      break;
    }
  }

  return jsonResponse({ success: true, updated });
}

// ── Helpers ──────────────────────────────────────────────────
function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
