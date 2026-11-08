// Danh sách trang có đường link riêng cho Google: tiêu đề, mô tả theo 3 ngôn ngữ (vi, en, zh).
// Đường link = mã trang trong website (#mã) => /mã/. Trang chủ là "/".
// Dùng chung cho functions/trang.js (gắn thẻ SEO), sitemap.xml.js và trang web (bấm link không tải lại trang).

export const SITE = "FarmBase";
export const LANGS = ["vi", "en", "zh"];
export const HREFLANG = { vi: "vi", en: "en", zh: "zh-Hans" };
export const OG_LOCALE = { vi: "vi_VN", en: "en_US", zh: "zh_CN" };

// [mã trang, ảnh chia sẻ, { vi:[tiêu đề, mô tả], en:[...], zh:[...] }, tên trong breadcrumb, trang cha]
const P = [
  ["trang-chu", "img/00.jpg", {
    vi: ["FarmBase – Số hóa vùng trồng, truy xuất nguồn gốc nông sản", "FarmBase giúp HTX, doanh nghiệp và địa phương quản lý vùng trồng, nhật ký canh tác và truy xuất nguồn gốc sầu riêng, cà phê tại Đắk Lắk. Giải pháp do BVI và Salefronts đồng phát triển."],
    en: ["FarmBase – Growing-area digitisation and farm-to-export traceability", "FarmBase helps cooperatives, exporters and local authorities manage growing areas, farm diaries and traceability for durian and coffee in Dak Lak, Vietnam. Built by BVI and Salefronts."],
    zh: ["FarmBase – 种植区数字化与农产品溯源", "FarmBase 帮助越南多乐省的合作社、企业和地方政府管理种植区、农事日志，实现榴莲、咖啡全程溯源。由 BVI 与 Salefronts 联合开发。"],
  }, "Trang chủ"],
  ["ve-chung-toi", "img/01.jpg", {
    vi: ["Về chúng tôi – Công ty Cổ phần BVI", "Công ty Cổ phần BVI thành lập năm 2019 tại Đắk Lắk: số hóa vùng trồng, tư vấn hồ sơ mã số vùng trồng, vận hành truy xuất nguồn gốc trên nền tảng FarmBase."],
    en: ["About us – BVI Joint Stock Company", "BVI JSC, founded in 2019 in Dak Lak, digitises growing areas, supports growing-area code dossiers and runs traceability on the FarmBase platform."],
    zh: ["关于我们 – BVI 股份公司", "BVI 股份公司 2019 年成立于多乐省，从事种植区数字化、种植区代码申报咨询，并在 FarmBase 平台上运营溯源系统。"],
  }, "Về chúng tôi"],
  ["giai-phap", "img/13.jpg", {
    vi: ["Giải pháp số hóa vùng nguyên liệu, mã vùng trồng, truy xuất", "Các giải pháp FarmBase cho từng khâu: truy xuất nguồn gốc, tư vấn mã số vùng trồng, mã cơ sở đóng gói, liên kết thu mua và công nghệ theo nhu cầu doanh nghiệp."],
    en: ["Solutions for growing areas, area codes and traceability", "FarmBase solutions for every stage: traceability, growing-area code support, packing-house code support, sourcing links and custom technology for enterprises."],
    zh: ["种植区数字化、种植区代码与溯源解决方案", "FarmBase 覆盖各环节的解决方案：溯源、种植区代码咨询、包装厂代码咨询、采购对接以及企业定制技术。"],
  }, "Giải pháp"],
  ["truy-xuat", "img/13.jpg", {
    vi: ["Phần mềm truy xuất nguồn gốc nông sản, nhật ký canh tác trên Zalo", "Nền tảng FarmBase: trang quản lý web và Zalo Mini App, nhật ký canh tác, QR vùng trồng và lô hàng, đồng bộ hệ thống truy xuất quốc gia."],
    en: ["Agricultural traceability software with Zalo farm diaries", "FarmBase platform: web dashboard and Zalo Mini App, farm diaries, QR codes for growing areas and lots, synced with Vietnam's national traceability system."],
    zh: ["农产品溯源软件与 Zalo 农事日志", "FarmBase 平台：网页管理端与 Zalo 小程序、农事日志、种植区和批次二维码，并与越南国家溯源系统同步。"],
  }, "Truy xuất nguồn gốc", "giai-phap"],
  ["ma-vung-trong", "img/g-vuon.jpg", {
    vi: ["Tư vấn mã số vùng trồng sầu riêng xuất khẩu", "BVI hỗ trợ khảo sát, đo GPS, flycam, bản đồ và hồ sơ kỹ thuật để vùng trồng đáp ứng điều kiện mã số vùng trồng, đồng hành duy trì sau khi có mã."],
    en: ["Growing-area code support for export durian", "BVI supports surveys, GPS mapping, drone imagery and technical dossiers so growing areas meet export growing-area code requirements, and helps maintain them afterwards."],
    zh: ["出口榴莲种植区代码咨询", "BVI 提供调查、GPS 测绘、无人机航拍、地图与技术档案支持，帮助种植区满足出口种植区代码要求，并在获码后持续协助维护。"],
  }, "Mã vùng trồng", "giai-phap"],
  ["ma-dong-goi", "img/kho3.jpg", {
    vi: ["Tư vấn mã cơ sở đóng gói sầu riêng xuất khẩu", "Tư vấn hồ sơ mã cơ sở đóng gói, liên kết vùng trồng có mã với cơ sở đóng gói, quản lý SKU và tem QR trên FarmBase."],
    en: ["Packing-house code support for export durian", "Support for packing-house code dossiers, linking coded growing areas with packing houses, and managing SKUs and QR labels on FarmBase."],
    zh: ["出口榴莲包装厂代码咨询", "提供包装厂代码申报咨询，连接已获码种植区与包装厂，并在 FarmBase 上管理 SKU 与二维码标签。"],
  }, "Mã đóng gói", "giai-phap"],
  ["thu-mua-ky-thuat", "img/09.jpg", {
    vi: ["Liên kết thu mua sầu riêng và chuẩn hóa kỹ thuật canh tác", "Kết nối vùng trồng có dữ liệu với kho thu mua, cơ sở đóng gói và doanh nghiệp xuất khẩu; chuẩn hóa kỹ thuật theo yêu cầu thị trường nhập khẩu."],
    en: ["Durian sourcing links and farming standards", "Connecting data-backed growing areas with buying warehouses, packing houses and exporters, and standardising practices to importing-market requirements."],
    zh: ["榴莲采购对接与种植技术规范", "将有数据的种植区与收购仓库、包装厂和出口企业对接，并按进口市场要求规范种植技术。"],
  }, "Thu mua, kỹ thuật", "giai-phap"],
  ["giai-phap-rieng", "img/14.jpg", {
    vi: ["Giải pháp công nghệ nông nghiệp theo nhu cầu doanh nghiệp", "Tích hợp hệ thống, báo cáo, tên miền truy xuất riêng và tính năng theo quy trình doanh nghiệp, xây trên nền tảng FarmBase."],
    en: ["Custom agri-tech solutions for enterprises", "System integration, reports, branded traceability domains and features tailored to your processes, built on the FarmBase platform."],
    zh: ["面向企业的定制农业科技方案", "基于 FarmBase 平台，提供系统集成、报表、专属溯源域名以及按企业流程定制的功能。"],
  }, "Công nghệ riêng", "giai-phap"],
  ["nguon-hang", "img/kho1.jpg", {
    vi: ["Nguồn hàng sầu riêng, nông sản Việt Nam có dữ liệu vùng trồng", "FarmBase kết nối người mua với HTX, cơ sở đóng gói và doanh nghiệp xuất khẩu Việt Nam. Mỗi nguồn hàng có dữ liệu vùng trồng và nhật ký canh tác."],
    en: ["Source Vietnamese durian and produce with growing-area data", "FarmBase connects buyers with Vietnamese cooperatives, packing houses and exporters. Every source comes with growing-area data and farm diaries you can check before buying."],
    zh: ["采购带种植区数据的越南榴莲与农产品", "FarmBase 为买家对接越南合作社、包装厂和出口企业，每个货源均附种植区数据和农事日志，购买前即可核查。"],
  }, "Nguồn hàng"],
  ["chien-dich-10000ha", "img/og-10000ha.jpg", {
    vi: ["Chiến dịch 10.000 ha cây trồng chủ lực Đắk Lắk 2026–2027", "Chiến dịch 10.000 ha cây trồng chủ lực niên vụ 2026–2027 tại Đắk Lắk: số hóa sản xuất, nâng chuẩn chất lượng, kết nối thương mại. Do HTX DaLa và BVI đề xuất."],
    en: ["10,000-hectare key crops campaign, Dak Lak 2026–2027", "The 2026–2027 campaign for 10,000 hectares of key crops in Dak Lak: digitised production, higher quality standards and trade links. Proposed by DaLa Cooperative and BVI."],
    zh: ["多乐省万公顷主要作物行动 2026–2027", "2026–2027 年度多乐省万公顷主要作物行动：生产数字化、提升质量标准、对接贸易。由 DaLa 合作社与 BVI 倡议。"],
  }, "Chiến dịch 10.000 ha"],
  ["doi-tac", "img/16.jpg", {
    vi: ["Khách hàng và đối tác đồng hành cùng FarmBase", "Các HTX, doanh nghiệp và tổ chức đang dùng FarmBase hoặc đồng hành cùng BVI tại Đắk Lắk, kèm sản phẩm, dịch vụ và đầu mối liên hệ."],
    en: ["FarmBase customers and partners", "Cooperatives, companies and organisations using FarmBase or working with BVI in Dak Lak, with their products, services and contacts."],
    zh: ["FarmBase 客户与合作伙伴", "正在使用 FarmBase 或与 BVI 合作的多乐省合作社、企业与机构，附产品、服务及联系方式。"],
  }, "Khách hàng, đối tác"],
  ["su-kien", "img/15.jpg", {
    vi: ["Sự kiện, tập huấn mã số vùng trồng và truy xuất nguồn gốc", "Hình ảnh khảo sát, tập huấn ghi nhật ký, hội nghị và bàn giao mà BVI thực hiện cùng UBND xã, HTX và Hiệp hội Sầu riêng tỉnh Đắk Lắk."],
    en: ["Events and trainings on growing-area codes and traceability", "Surveys, farm-diary trainings, conferences and handovers run by BVI with communes, cooperatives and the Dak Lak Durian Association."],
    zh:["种植区代码与溯源培训活动", "BVI 与乡政府、合作社及多乐省榴莲协会共同开展的调查、日志培训、会议与交付活动。"],
  }, "Sự kiện"],
  ["blog", "img/12.jpg", {
    vi: ["Blog FarmBase: kiến thức mã số vùng trồng, truy xuất, báo chí", "Báo chí ghi nhận, kiến thức mã số vùng trồng, xuất khẩu sầu riêng và hướng dẫn dùng FarmBase hiệu quả."],
    en: ["FarmBase blog: growing-area codes, traceability, news", "Press coverage, know-how on growing-area codes and durian exports, and guides to using FarmBase."],
    zh: ["FarmBase 博客：种植区代码、溯源与新闻", "媒体报道、种植区代码与榴莲出口知识，以及 FarmBase 使用指南。"],
  }, "Blog"],
  ["lien-he", "img/04.jpg", {
    vi: ["Liên hệ FarmBase – Hotline 0911 423 839", "Để lại thông tin để chuyên viên FarmBase tư vấn số hóa vùng trồng, mã số vùng trồng và truy xuất nguồn gốc. Hotline, Zalo: 0911 423 839."],
    en: ["Contact FarmBase – Hotline +84 911 423 839", "Leave your details and a FarmBase specialist will advise on growing-area digitisation, area codes and traceability. Hotline and Zalo: +84 911 423 839."],
    zh: ["联系 FarmBase – 热线 +84 911 423 839", "留下您的信息，FarmBase 专员将为您提供种植区数字化、种植区代码与溯源咨询。热线及 Zalo：+84 911 423 839。"],
  }, "Liên hệ"],
  ["chinh-sach-bao-mat", "img/00.jpg", {
    vi: ["Chính sách bảo mật", "Chính sách bảo mật dữ liệu và cookie của website FarmBase, Công ty Cổ phần BVI."],
    en: ["Privacy policy", "Data and cookie privacy policy of the FarmBase website, BVI JSC."],
    zh: ["隐私政策", "FarmBase 网站（BVI 股份公司）的数据与 Cookie 隐私政策。"],
  }, "Chính sách bảo mật"],
  ["dieu-khoan-su-dung", "img/00.jpg", {
    vi: ["Điều khoản sử dụng", "Điều khoản sử dụng website FarmBase, Công ty Cổ phần BVI."],
    en: ["Terms of use", "Terms of use of the FarmBase website, BVI JSC."],
    zh: ["使用条款", "FarmBase 网站（BVI 股份公司）使用条款。"],
  }, "Điều khoản sử dụng"],
];

export const PAGES = Object.fromEntries(P.map(([id, img, t, crumb, parent]) => [id, { id, img, t, crumb, parent }]));
export const pagePath = (id) => (id === "trang-chu" ? "/" : `/${id}/`);
// Mức ưu tiên trong sitemap
export const PRIORITY = { "trang-chu": "1.0", "giai-phap": "0.9", "ma-vung-trong": "0.9", "truy-xuat": "0.9", "chien-dich-10000ha": "0.8", "nguon-hang": "0.8" };

export const ORG = (o) => ({
  "@type": "Organization", "@id": `${o}/#org`, name: "Công ty Cổ phần BVI", alternateName: ["BVI", "FarmBase"], url: `${o}/`,
  logo: `${o}/img/logos/bvi.png`, email: "info@bvi.vn", telephone: "+84911423839", taxID: "6001653877", foundingDate: "2019-03-13",
  address: { "@type": "PostalAddress", streetAddress: "150 Phan Huy Chú, P. Thành Nhất", addressRegion: "Đắk Lắk", addressCountry: "VN" },
  areaServed: "VN", sameAs: ["https://www.facebook.com/farmbasevn", "https://zalo.me/1461539868993925462"],
  contactPoint: { "@type": "ContactPoint", telephone: "+84911423839", contactType: "customer service", availableLanguage: ["vi", "en", "zh"] },
});
