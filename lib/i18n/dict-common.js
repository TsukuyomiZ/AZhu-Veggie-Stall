// 共用字典:導覽、通用按鈕、登入、今日備貨頁、日期詞
// key 慣例:「領域.意義」小寫點分隔;變數用 {n} 佔位,由 t() 代入
//
// ⚠️ 契約區(common.* / nav.* / date.* / weekday.*):
//   其他字典檔的頁面會直接引用這些 key,名稱與語意不可更改。
const dictCommon = {
  zh: {
    "app.name": "阿珠菜攤",

    // ---- 契約:通用按鈕/狀態 ----
    "common.loading": "載入中…",
    "common.save": "儲存",
    "common.cancel": "取消",
    "common.delete": "刪除",
    "common.edit": "編輯",
    "common.confirm": "確認",
    "common.add": "新增",
    "common.retry": "重試",

    // ---- 契約:導覽 ----
    "nav.today": "今日備貨",
    "nav.orders": "訂單",
    "nav.customers": "客戶",
    "nav.stats": "統計",
    "nav.login": "登入",

    // ---- 契約:日期詞 ----
    "date.today": "今天",
    "date.tomorrow": "明天",
    // 短日期:中文 月/日、越南文 日/月({w} 可不帶,見 date.shortDate)
    "date.shortFormat": "{m}/{d} ({w})",
    "date.shortDate": "{m}/{d}",
    "weekday.0": "日",
    "weekday.1": "一",
    "weekday.2": "二",
    "weekday.3": "三",
    "weekday.4": "四",
    "weekday.5": "五",
    "weekday.6": "六",

    // ---- 導覽(非契約) ----
    "nav.main": "主導覽",
    "nav.newOrder": "新增訂單",

    // ---- 今日備貨頁 ----
    // {m}=月 {d}=日 {w}=weekday.* 的值
    "today.dateFormat": "{m}月{d}日(星期{w})",
    "today.pickDate": "選擇日期",
    "today.loadError": "載入訂單失敗,請檢查網路後再試一次。",
    "today.patchError": "勾選沒有存成功,已恢復原狀,請再試一次。",
    "today.reload": "重新載入",
    "today.emptyTitle": "這一天沒有訂單",
    "today.emptyHint": "先新增訂單,才有備貨清單",
    "today.emptyCta": "去新增訂單",
    "today.progressTitle": "備貨進度 — 總品項 {n} 項",
    "today.prepared": "已備",
    "today.unprepared": "未備",
    "today.totalItems": "總品項",
    // {prepared}=已備品項數 {total}=總品項數(店家收合卡標題)
    "today.storeProgress": "備貨數量:{prepared}/{total}",
    "today.done": "完成",

    // ---- 登入頁 ----
    "login.alreadyIn": "你已經登入了,可以使用全部功能。",
    "login.logout": "登出",
    "login.backToday": "回今日備貨",
    "login.password": "密碼",
    "login.enterPassword": "請輸入密碼",
    "login.failed": "登入失敗,請再試一次",
    "login.networkError": "網路錯誤,請再試一次",
    "login.loggingIn": "登入中…",
    "login.noPassword": "沒有密碼嗎?",
    "login.guestLink": "不登入,只看今日備貨",

    // ---- 登入狀態(RequireAuth 與登入頁共用) ----
    "auth.checking": "確認登入狀態中…",
    "auth.needLogin": "這個頁面需要登入",
    "auth.guestHint": "未登入時只能查看今日備貨",
    "auth.goLogin": "前往登入",
  },
  vi: {
    "app.name": "Sạp rau A Châu",

    // ---- 契約:通用按鈕/狀態 ----
    "common.loading": "Đang tải…",
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.delete": "Xóa",
    "common.edit": "Sửa",
    "common.confirm": "Xác nhận",
    "common.add": "Thêm",
    "common.retry": "Thử lại",

    // ---- 契約:導覽 ----
    "nav.today": "Hàng hôm nay",
    "nav.orders": "Đơn hàng",
    "nav.customers": "Khách hàng",
    "nav.stats": "Thống kê",
    "nav.login": "Đăng nhập",

    // ---- 契約:日期詞 ----
    "date.today": "Hôm nay",
    "date.tomorrow": "Ngày mai",
    // 越南習慣 日/月
    "date.shortFormat": "{d}/{m} ({w})",
    "date.shortDate": "{d}/{m}",
    "weekday.0": "CN",
    "weekday.1": "T2",
    "weekday.2": "T3",
    "weekday.3": "T4",
    "weekday.4": "T5",
    "weekday.5": "T6",
    "weekday.6": "T7",

    // ---- 導覽(非契約) ----
    "nav.main": "Điều hướng chính",
    "nav.newOrder": "Thêm đơn hàng",

    // ---- 今日備貨頁 ----
    // 越南習慣 日/月,星期用縮寫:24/7 (T5)
    "today.dateFormat": "{d}/{m} ({w})",
    "today.pickDate": "Chọn ngày",
    "today.loadError": "Tải đơn hàng không được, kiểm tra mạng rồi thử lại nhé.",
    "today.patchError": "Chưa lưu được dấu tick, đã trả lại như cũ, thử lại nhé.",
    "today.reload": "Tải lại",
    "today.emptyTitle": "Ngày này chưa có đơn nào",
    "today.emptyHint": "Thêm đơn trước thì mới có danh sách soạn hàng",
    "today.emptyCta": "Đi thêm đơn hàng",
    "today.progressTitle": "Tiến độ soạn hàng — tổng cộng {n} món",
    "today.prepared": "Đã soạn",
    "today.unprepared": "Chưa soạn",
    "today.totalItems": "Tổng món",
    "today.storeProgress": "Soạn hàng: {prepared}/{total}",
    "today.done": "Xong",

    // ---- 登入頁 ----
    "login.alreadyIn": "Bạn đăng nhập rồi, dùng được hết các chức năng.",
    "login.logout": "Đăng xuất",
    "login.backToday": "Về trang hàng hôm nay",
    "login.password": "Mật khẩu",
    "login.enterPassword": "Nhập mật khẩu nhé",
    "login.failed": "Đăng nhập không được, thử lại nhé",
    "login.networkError": "Lỗi mạng, thử lại nhé",
    "login.loggingIn": "Đang đăng nhập…",
    "login.noPassword": "Không có mật khẩu hả?",
    "login.guestLink": "Không đăng nhập, chỉ xem hàng hôm nay",

    // ---- 登入狀態(RequireAuth 與登入頁共用) ----
    "auth.checking": "Đang kiểm tra đăng nhập…",
    "auth.needLogin": "Trang này cần đăng nhập",
    "auth.guestHint": "Chưa đăng nhập thì chỉ xem được hàng hôm nay",
    "auth.goLogin": "Đi đăng nhập",
  },
};

export default dictCommon;
