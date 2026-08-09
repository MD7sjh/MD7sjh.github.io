/* Shared constants and mutable UI runtime state. */
'use strict';

const STORAGE_KEY = 'personal_workspace_state_v1';
const LEGACY_STORAGE_KEYS = ['phd_master_workspace_merged_v1'];
const SUBMISSION_COLUMNS = ['选题中','写作中','待投稿','已投稿','审稿中','返修中','已接收','已见刊/已收录','搁置/拒稿'];
const STAGE_COLORS = {
  '选题中':'#9B5DE5','写作中':'#FF8C42','待投稿':'#4D9DE0','已投稿':'#43AA8B','审稿中':'#3b82f6','返修中':'#f97316','已接收':'#10b981','已见刊/已收录':'#059669','搁置/拒稿':'#9ca3af'
};
const CATEGORY_COLORS = { research:'#BBAECC', writing:'#FF8C42', reading:'#4D9DE0', admin:'#9fbcdb', other:'#43AA8B' };
const GTD_BUCKETS = [
  { value:'inbox', label:'收集箱', short:'Inbox' },
  { value:'next', label:'下一步', short:'Next' },
  { value:'waiting', label:'等待反馈', short:'Waiting' },
  { value:'someday', label:'将来也许', short:'Someday' },
  { value:'done', label:'已完成', short:'Done' }
];
const QUADRANT_OPTIONS = [
  { value:'q1', label:'重要且紧急', short:'Q1', note:'先处理，防止失控', color:'bg-rose-100 text-rose-700' },
  { value:'q2', label:'重要不紧急', short:'Q2', note:'最值得主动安排时间块', color:'bg-purple-100 text-purple-700' },
  { value:'q3', label:'紧急不重要', short:'Q3', note:'能委托就委托，能压缩就压缩', color:'bg-sky-100 text-sky-700' },
  { value:'q4', label:'不紧急不重要', short:'Q4', note:'少量保留，避免吞掉注意力', color:'bg-gray-100 text-gray-600' }
];
const TODAY_BUCKETS = [
  { value:'', label:'不放入今日清单', short:'未安排', color:'bg-gray-100 text-gray-600' },
  { value:'must', label:'今日必做', short:'Must', color:'bg-rose-100 text-rose-700' },
  { value:'should', label:'今日应该', short:'Should', color:'bg-amber-100 text-amber-700' },
  { value:'could', label:'今日可以', short:'Could', color:'bg-emerald-100 text-emerald-700' }
];
const TASK_STATUS_OPTIONS = [
  { value:'planned', label:'计划中', progress:10, color:'bg-slate-100 text-slate-600' },
  { value:'todo', label:'没开始', progress:0, color:'bg-gray-100 text-gray-600' },
  { value:'active', label:'进行中', progress:50, color:'bg-sky-100 text-sky-700' },
  { value:'done', label:'完成', progress:100, color:'bg-emerald-100 text-emerald-700' }
];
const PROJECT_AREAS = [
  { value:'research', label:'科研 / 实验' },
  { value:'writing', label:'写作 / 论文' },
  { value:'submission', label:'投稿 / 发表' },
  { value:'admin', label:'行政 / 沟通' },
  { value:'life', label:'生活 / 个人事务' },
  { value:'other', label:'其他 / 暂不好分类' }
];
const PROJECT_STATUS_OPTIONS = [
  { value:'active', label:'进行中' },
  { value:'paused', label:'暂停' },
  { value:'done', label:'已完成' }
];
const UPWARD_STATUS_OPTIONS = [
  { value:'drafting', emoji:'📝', label:'准备沟通' },
  { value:'reported', emoji:'📤', label:'已汇报 / 已发送' },
  { value:'meeting', emoji:'🗣️', label:'已沟通 / 已开会' },
  { value:'waiting', emoji:'⏳', label:'等待反馈' },
  { value:'blocked', emoji:'🚩', label:'需要主动推进' }
];
const UPWARD_PROMISE_STATUS_OPTIONS = [
  { value:'open', label:'待核对', color:'bg-yellow-100 text-yellow-800' },
  { value:'confirmed', label:'已确认待兑现', color:'bg-sky-100 text-sky-700' },
  { value:'remind', label:'需再次提醒', color:'bg-rose-100 text-rose-700' },
  { value:'resolved', label:'已落实', color:'bg-emerald-100 text-emerald-700' }
];
const UPWARD_CHANNEL_OPTIONS = ['', '面谈', '邮件 / 微信', '文稿批注', '会议', '电话 / 视频', '其他'];
const UPWARD_ROLE_OPTIONS = [
  { value:'advisor', label:'导师 / PI' },
  { value:'manager', label:'直属领导 / Manager' },
  { value:'boss', label:'老板 / 负责人' },
  { value:'project_lead', label:'项目负责人' },
  { value:'client', label:'客户 / 合作方负责人' },
  { value:'other', label:'其他上级 / 关键对象' }
];

const PAPER_TYPES = [
  { value:'conference', label:'Conference', icon:'🎤' },
  { value:'journal', label:'Journal', icon:'📚' },
  { value:'workshop', label:'Workshop', icon:'🧩' },
  { value:'thesis', label:'Thesis / 学位论文', icon:'🎓' },
  { value:'report', label:'Technical Report', icon:'📑' },
  { value:'other', label:'其他', icon:'📝' }
];
const PAPER_STATUSES = [
  { value:'idea', label:'构思中', color:'bg-pink-100 text-pink-700' },
  { value:'drafting', label:'写作中', color:'bg-sky-100 text-sky-700' },
  { value:'experiment', label:'实验 / 分析中', color:'bg-amber-100 text-amber-700' },
  { value:'polishing', label:'修改 / 润色中', color:'bg-purple-100 text-purple-700' },
  { value:'submitted', label:'已投稿 / 已提交', color:'bg-blue-100 text-blue-700' },
  { value:'revision', label:'返修中', color:'bg-orange-100 text-orange-700' },
  { value:'accepted', label:'已接收 / 已完成', color:'bg-emerald-100 text-emerald-700' },
  { value:'archived', label:'归档 / 暂缓', color:'bg-gray-100 text-gray-600' }
];
const PAPER_SECTION_STATUSES = [
  { value:'draft', label:'草稿' },
  { value:'revise', label:'修改' },
  { value:'done', label:'完成' }
];
const PAPER_LOG_TYPES = [
  { value:'writing', label:'写作', icon:'📝' },
  { value:'revise', label:'修改', icon:'✍️' },
  { value:'experiment', label:'实验', icon:'🧪' },
  { value:'analysis', label:'分析', icon:'📊' },
  { value:'meeting', label:'讨论 / 会议', icon:'👥' },
  { value:'submission', label:'投稿材料', icon:'📮' },
  { value:'other', label:'其他', icon:'📌' }
];

const TRAVEL_PLAN_STATUSES = [
  { value:'idea', label:'想去 / 灵感', color:'bg-pink-100 text-pink-700' },
  { value:'planning', label:'规划中', color:'bg-sky-100 text-sky-700' },
  { value:'booked', label:'已预订 / 待出发', color:'bg-purple-100 text-purple-700' },
  { value:'completed', label:'已完成', color:'bg-emerald-100 text-emerald-700' },
  { value:'paused', label:'暂缓', color:'bg-gray-100 text-gray-600' }
];
const TRAVEL_NOTE_TYPES = [
  { value:'idea', label:'零碎想法', icon:'💭' },
  { value:'place', label:'想去地点', icon:'📍' },
  { value:'food', label:'吃喝', icon:'🍜' },
  { value:'stay', label:'住宿', icon:'🏡' },
  { value:'transport', label:'交通', icon:'🚆' },
  { value:'todo', label:'待办 / 准备', icon:'✅' },
  { value:'link', label:'链接 / 攻略', icon:'🔗' },
  { value:'other', label:'其他', icon:'✨' }
];
const REVIEW_ENERGY_OPTIONS = [
  { value:'high', emoji:'☀️', label:'高：可以攻坚', short:'高', color:'text-dopamine-orange' },
  { value:'medium', emoji:'😐', label:'中：稳定推进', short:'中', color:'text-dopamine-sky' },
  { value:'low', emoji:'🌧️', label:'低：需要降载', short:'低', color:'text-dopamine-purple' }
];


const ACCOUNTING_TRANSACTION_TYPES = [
  { value:'expense', label:'支出', icon:'↗', color:'text-rose-600', tone:'bg-rose-50 border-rose-100' },
  { value:'income', label:'收入', icon:'↙', color:'text-emerald-600', tone:'bg-emerald-50 border-emerald-100' }
];
const ACCOUNTING_EXPENSE_CATEGORIES = [
  { value:'food', label:'餐饮', icon:'🍜' },
  { value:'transport', label:'交通', icon:'🚇' },
  { value:'housing', label:'房租 / 住宿', icon:'🏠' },
  { value:'utilities', label:'水电 / 通讯', icon:'💡' },
  { value:'study', label:'学习 / 书籍', icon:'📚' },
  { value:'research', label:'科研 / 实验', icon:'🧪' },
  { value:'health', label:'医疗 / 健身', icon:'💊' },
  { value:'shopping', label:'购物', icon:'🛍️' },
  { value:'entertainment', label:'娱乐', icon:'🎬' },
  { value:'social', label:'社交 / 礼物', icon:'🎁' },
  { value:'travel', label:'旅行', icon:'🧳' },
  { value:'other_expense', label:'其他支出', icon:'🧾' }
];
const ACCOUNTING_INCOME_CATEGORIES = [
  { value:'salary', label:'工资 / 助研', icon:'💼' },
  { value:'scholarship', label:'奖学金 / 津贴', icon:'🎓' },
  { value:'reimbursement', label:'报销', icon:'🧾' },
  { value:'bonus', label:'奖金 / 稿费', icon:'✨' },
  { value:'transfer_in', label:'家人转入 / 其他转入', icon:'💌' },
  { value:'other_income', label:'其他收入', icon:'🌱' }
];
const ACCOUNTING_ACCOUNTS = [
  { value:'cash', label:'现金', icon:'💵' },
  { value:'bank', label:'银行卡', icon:'🏦' },
  { value:'mobile', label:'电子钱包', icon:'📱' },
  { value:'credit', label:'信用卡', icon:'💳' },
  { value:'other', label:'其他账户', icon:'🪙' }
];
const ACCOUNTING_CURRENCIES = [
  { value:'CNY', label:'CNY · 人民币', symbol:'¥' },
  { value:'MOP', label:'MOP · 澳门元', symbol:'MOP$' },
  { value:'HKD', label:'HKD · 港币', symbol:'HK$' },
  { value:'SGD', label:'SGD · 新加坡元', symbol:'S$' },
  { value:'USD', label:'USD · 美元', symbol:'$' }
];


const SAVINGS_GOAL_CATEGORIES = [
  { value:'travel', label:'旅行 / 远方', icon:'✈️' },
  { value:'education', label:'学习 / 深造', icon:'🎓' },
  { value:'device', label:'数码 / 设备', icon:'💻' },
  { value:'home', label:'住房 / 搬家', icon:'🏡' },
  { value:'emergency', label:'应急储备', icon:'🛟' },
  { value:'experience', label:'体验 / 兴趣', icon:'🎨' },
  { value:'family', label:'家人 / 礼物', icon:'🎁' },
  { value:'career', label:'职业 / 创业', icon:'🚀' },
  { value:'other', label:'其他愿望', icon:'🌟' }
];
const SAVINGS_GOAL_PRIORITIES = [
  { value:'high', label:'优先实现', color:'bg-rose-100 text-rose-700' },
  { value:'medium', label:'稳步推进', color:'bg-amber-100 text-amber-700' },
  { value:'low', label:'从容准备', color:'bg-sky-100 text-sky-700' }
];
const SAVINGS_GOAL_STATUSES = [
  { value:'active', label:'进行中', color:'bg-emerald-100 text-emerald-700' },
  { value:'paused', label:'暂缓', color:'bg-gray-100 text-gray-600' },
  { value:'completed', label:'已攒够', color:'bg-purple-100 text-purple-700' }
];
const SAVINGS_ENTRY_TYPES = [
  { value:'deposit', label:'存入', icon:'🌱', color:'text-emerald-600', tone:'bg-emerald-50 border-emerald-100' },
  { value:'withdrawal', label:'取出', icon:'↩️', color:'text-rose-600', tone:'bg-rose-50 border-rose-100' }
];


const RESEARCH_IDEA_AREAS = [
  { value:'3d_graphics', label:'3D / Graphics', icon:'🧊' },
  { value:'image_video', label:'图像 / 视频生成', icon:'🎬' },
  { value:'multimodal', label:'多模态理解与生成', icon:'🧩' },
  { value:'robotics', label:'机器人 / 具身智能', icon:'🤖' },
  { value:'photography', label:'计算摄影 / 相机智能', icon:'📷' },
  { value:'systems', label:'系统 / 数据 / 工程', icon:'🛠️' },
  { value:'theory', label:'理论 / 方法分析', icon:'📐' },
  { value:'other', label:'其他研究方向', icon:'💡' }
];
const RESEARCH_IDEA_STATUSES = [
  { value:'captured', label:'灵感收集', color:'bg-pink-100 text-pink-700' },
  { value:'exploring', label:'调研中', color:'bg-sky-100 text-sky-700' },
  { value:'validating', label:'验证中', color:'bg-amber-100 text-amber-700' },
  { value:'developing', label:'方案发展中', color:'bg-purple-100 text-purple-700' },
  { value:'adopted', label:'已纳入项目', color:'bg-emerald-100 text-emerald-700' },
  { value:'archived', label:'暂存 / 归档', color:'bg-gray-100 text-gray-600' }
];
const RESEARCH_IDEA_PRIORITIES = [
  { value:'high', label:'重点推进', color:'bg-rose-100 text-rose-700' },
  { value:'medium', label:'值得跟踪', color:'bg-amber-100 text-amber-700' },
  { value:'low', label:'灵感备忘', color:'bg-slate-100 text-slate-600' }
];
const RESEARCH_IDEA_SOURCE_TYPES = [
  { value:'paper', label:'论文阅读', icon:'📄' },
  { value:'experiment', label:'实验现象', icon:'🧪' },
  { value:'discussion', label:'讨论 / 交流', icon:'💬' },
  { value:'reviewer', label:'审稿意见', icon:'📝' },
  { value:'dataset', label:'数据集 / Benchmark', icon:'🗂️' },
  { value:'project', label:'既有项目 / 代码', icon:'💻' },
  { value:'observation', label:'真实观察 / 需求', icon:'👀' },
  { value:'other', label:'其他来源', icon:'✨' }
];
const RESEARCH_IDEA_REFERENCE_TYPES = [
  { value:'paper', label:'论文', icon:'📄' },
  { value:'dataset', label:'数据集 / Benchmark', icon:'🗂️' },
  { value:'code', label:'代码 / 项目', icon:'💻' },
  { value:'website', label:'网页 / 博客', icon:'🌐' },
  { value:'book', label:'书籍 / 报告', icon:'📚' },
  { value:'other', label:'其他资料', icon:'🔖' }
];

const $ = (id) => document.getElementById(id);
const sections = ['home-section','workflow-section','research-ideas-section','paper-section','submission-section','accounting-section','savings-section','travel-section','upward-section','review-section','dashboard-section','settings-section'];
const charts = { focus:null, attendance:null, papers:null, support:null, submission:null, accountingTrend:null, accountingCategory:null, savingsTrend:null, savingsProgress:null, researchIdeaStatus:null, researchIdeaSources:null, researchIdeaDashboard:null, travelStatus:null, travelNotes:null };
const PREF_SIDEBAR_HIDDEN_KEY = `${STORAGE_KEY}__sidebar_hidden`;
const PREF_STATS_MODE_KEY = `${STORAGE_KEY}__stats_mode`;
let currentSection = 'home-section';
let focusInterval = null;
let editContext = null;
let sidebarHidden = false;
let statsMode = 'day'; // 'day' | 'week' | 'month'
