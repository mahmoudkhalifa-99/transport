
/**
 * نظام إدارة نقل الخامات - الإصدار المطور بالكامل
 * ربط واجهة React بجدول بيانات Google Sheets (رؤوس عربية)
 * يدعم: نقل الخامات، الإفراجات، رصيد المصانع، والبيانات الأساسية
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

// أسماء الصفحات (الشيتات) بالعربي كما هي في النظام
const SHEETS = {
  TRANSPORTS_SOY: "نقل_صويا",
  TRANSPORTS_MAIZE: "نقل_ذرة",
  RELEASES_SOY: "إفراجات_صويا",
  RELEASES_MAIZE: "إفراجات_ذرة",
  FACTORY_BALANCES: "رصيد_المصانع",
  MASTER_DATA: "البيانات_الأساسية",
  USERS: "المستخدمين"
};

/**
 * وظيفة تهيئة الجداول (قم بتشغيلها مرة واحدة عند إعداد المشروع)
 */
function initialSetup() {
  Object.values(SHEETS).forEach(name => {
    if (!SS.getSheetByName(name)) {
      const sheet = SS.insertSheet(name);
      if (name.includes("نقل")) {
        sheet.appendRow(["المسلسل", "التاريخ", "وقت الخروج", "رقم السيارة", "اسم السائق", "هاتف السائق", "نوع البضاعة", "الوزن الصافي", "الحالة", "رقم أمر التوريد", "موقع التعتيق", "ملاحظات", "مقاول النقل", "رقم البوليصة", "مكان التحميل", "نوع السيارة", "طريقة النقل", "المينا", "اسم المركب", "اللودر", "موظف التشغيل", "أمين المخزن", "الأمناء", "المورد", "رقم الشهادة", "القطع", "عقد جديد"]);
      } else if (name.includes("إفراجات")) {
        sheet.appendRow(["المسلسل", "رقم الإفراج", "رقم أمر التوريد", "التاريخ", "اسم الموقع", "نوع البضاعة", "الكمية الإجمالية", "ملاحظات"]);
      } else if (name === "رصيد_المصانع") {
        sheet.appendRow(["اسم الموقع", "نوع البضاعة", "رصيد البداية", "الصرف اليدوي"]);
      } else if (name === "المستخدمين") {
        sheet.appendRow(["الاسم", "PIN", "الصلاحية", "الأصناف المسموحة"]);
        sheet.appendRow(["مدير النظام", "1234", "admin", "الكل"]);
      } else if (name === "البيانات_الأساسية") {
        sheet.appendRow(["التصنيف", "القيم"]);
      }
    }
  });
}

/**
 * استقبال طلبات GET لجلب البيانات
 */
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getAllData") {
      return createResponse({
        transports: [
          ...getDataFromSheet(SHEETS.TRANSPORTS_SOY, getMap("record")), 
          ...getDataFromSheet(SHEETS.TRANSPORTS_MAIZE, getMap("record"))
        ],
        releases: [
          ...getDataFromSheet(SHEETS.RELEASES_SOY, getMap("release")), 
          ...getDataFromSheet(SHEETS.RELEASES_MAIZE, getMap("release"))
        ],
        factoryBalances: getDataFromSheet(SHEETS.FACTORY_BALANCES, getMap("factoryBalance")),
        masterData: getMasterData()
      });
    }
  } catch (err) { 
    return createResponse({ error: err.message }, 500); 
  }
}

/**
 * استقبال طلبات POST للإضافة، التعديل، والحذف
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === "addRecord") saveItem(postData.record, getMap("record"));
    else if (action === "updateRecord") updateItem(postData.record, getMap("record"), "المسلسل");
    else if (action === "deleteRecord") deleteItem(postData.autoId, postData.goodsType, "record", "المسلسل");
    else if (action === "saveMasterData") saveMasterConfig(postData.data);
    else if (action === "addReleasesBulk") addReleasesBulk(postData.header, postData.distributions);
    else if (action === "updateRelease") updateItem(postData.release, getMap("release"), "المسلسل");
    else if (action === "deleteRelease") deleteItem(postData.id, postData.goodsType, "release", "المسلسل");
    else if (action === "updateFactoryBalance") updateFactoryBalance(postData.balance);

    return createResponse({ success: true });
  } catch (err) { 
    return createResponse({ error: err.message }, 500); 
  }
}

/**
 * خريطة الموازنة بين أسماء الحقول في التطبيق ورؤوس الأعمدة في الشيت
 */
function getMap(type) {
  if (type === "record") {
    return {
      autoId: "المسلسل", date: "التاريخ", departureTime: "وقت الخروج", carNumber: "رقم السيارة", driverName: "اسم السائق",
      driverPhone: "هاتف السائق", goodsType: "نوع البضاعة", weight: "الوزن الصافي", status: "الحالة", orderNo: "رقم أمر التوريد",
      unloadingSite: "موقع التعتيق", notes: "ملاحظات", contractorName: "مقاول النقل", waybillNo: "رقم البوليصة",
      loadingSite: "مكان التحميل", carType: "نوع السيارة", transportMethod: "طريقة النقل", port: "المينا",
      shipName: "اسم المركب", loader: "اللودر", operationEmployee: "موظف التشغيل", warehouseKeeper: "أمين المخزن",
      trustees: "الأمناء", supplier: "المورد", certificateNo: "رقم الشهادة", pieces: "القطع", newContract: "عقد جديد"
    };
  } else if (type === "release") {
    return {
      id: "المسلسل", releaseNo: "رقم الإفراج", orderNo: "رقم أمر التوريد", date: "التاريخ",
      siteName: "اسم الموقع", goodsType: "نوع البضاعة", totalQuantity: "الكمية الإجمالية", notes: "ملاحظات"
    };
  } else if (type === "factoryBalance") {
    return {
      siteName: "اسم الموقع", goodsType: "نوع البضاعة", openingBalance: "رصيد البداية", manualConsumption: "الصرف اليدوي"
    };
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getDataFromSheet(name, map) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return [];
  const vals = sheet.getDataRange().getValues();
  if (vals.length <= 1) return [];
  const headers = vals[0];
  const revMap = Object.entries(map).reduce((a, [k, v]) => (a[v] = k, a), {});
  return vals.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => { if (revMap[h]) obj[revMap[h]] = row[i]; });
    return obj;
  });
}

function saveItem(item, map) {
  const sheetName = String(item.goodsType).includes("صويا") ? SHEETS.TRANSPORTS_SOY : SHEETS.TRANSPORTS_MAIZE;
  const sheet = SS.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(h => {
    const key = Object.keys(map).find(k => map[k] === h);
    return item[key] || "";
  }));
}

function updateItem(item, map, idCol) {
  const isSoy = String(item.goodsType).includes("صويا");
  const isRelease = map["id"] ? true : false;
  let sheetName = "";
  
  if (isRelease) {
    sheetName = isSoy ? SHEETS.RELEASES_SOY : SHEETS.RELEASES_MAIZE;
  } else {
    sheetName = isSoy ? SHEETS.TRANSPORTS_SOY : SHEETS.TRANSPORTS_MAIZE;
  }
  
  const sheet = SS.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idCol);
  const idValue = isRelease ? item.id : item.autoId;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      const row = headers.map(h => {
        const key = Object.keys(map).find(k => map[k] === h);
        return item[key] !== undefined ? item[key] : data[i][headers.indexOf(h)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return;
    }
  }
}

function updateFactoryBalance(item) {
  const sheet = SS.getSheetByName(SHEETS.FACTORY_BALANCES);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const siteIdx = headers.indexOf("اسم الموقع");
  const goodsIdx = headers.indexOf("نوع البضاعة");
  const map = getMap("factoryBalance");

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][siteIdx]).trim() === String(item.siteName).trim() && 
        String(data[i][goodsIdx]).trim() === String(item.goodsType).trim()) {
      const row = headers.map(h => {
        const key = Object.keys(map).find(k => map[k] === h);
        return item[key] !== undefined ? item[key] : data[i][headers.indexOf(h)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow(headers.map(h => {
      const key = Object.keys(map).find(k => map[k] === h);
      return item[key] || "";
    }));
  }
}

function deleteItem(id, goodsType, type, idCol) {
  const isSoy = String(goodsType).includes("صويا");
  const sheetName = type === "record" ? (isSoy ? SHEETS.TRANSPORTS_SOY : SHEETS.TRANSPORTS_MAIZE) : (isSoy ? SHEETS.RELEASES_SOY : SHEETS.RELEASES_MAIZE);
  const sheet = SS.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const idIdx = data[0].indexOf(idCol);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(id)) { sheet.deleteRow(i + 1); return; }
  }
}

function saveMasterConfig(data) {
  const mSheet = SS.getSheetByName(SHEETS.MASTER_DATA);
  mSheet.clear().appendRow(["التصنيف", "القيم"]);
  Object.keys(data).forEach(k => { 
    if (k !== "users") mSheet.appendRow([k, JSON.stringify(data[k])]); 
  });
  
  const uSheet = SS.getSheetByName(SHEETS.USERS);
  uSheet.clear().appendRow(["الاسم", "PIN", "الصلاحية", "الأصناف المسموحة"]);
  if (data.users) {
    data.users.forEach(u => {
      uSheet.appendRow([u.name, u.pin, u.role, u.allowedMaterials]);
    });
  }
}

function getMasterData() {
  const mSheet = SS.getSheetByName(SHEETS.MASTER_DATA);
  const mData = mSheet.getDataRange().getValues();
  let master = { drivers: [], cars: [], loadingSites: [], unloadingSites: [], goodsTypes: [], orderNumbers: [], contractors: [], users: [], items: [] };
  
  mData.slice(1).forEach(r => { 
    try { 
      master[r[0]] = JSON.parse(r[1]); 
    } catch (e) {} 
  });
  
  const uSheet = SS.getSheetByName(SHEETS.USERS);
  const uData = uSheet.getDataRange().getValues();
  if (uData.length > 1) {
    master.users = uData.slice(1).map(r => ({ name: r[0], pin: r[1], role: r[2], allowedMaterials: r[3] }));
  }
  return master;
}

function addReleasesBulk(header, distributions) {
  distributions.forEach(dist => {
    const isSoy = String(header.goodsType).includes("صويا");
    const sheet = SS.getSheetByName(isSoy ? SHEETS.RELEASES_SOY : SHEETS.RELEASES_MAIZE);
    const rec = {
      id: "REL-" + Math.floor(1000 + Math.random() * 9000), releaseNo: header.releaseNo, orderNo: header.orderNo,
      date: header.date, siteName: dist.siteName, goodsType: header.goodsType, totalQuantity: dist.quantity, notes: header.notes || ""
    };
    const map = getMap("release");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map(h => {
      const key = Object.keys(map).find(k => map[k] === h);
      return rec[key] || "";
    }));
  });
}
