/**
 * Global constants and runtime variables
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 */
'use strict';

const STORAGE_KEY = 'phd_master_workspace_merged_v1';

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
      { value:'life', label:'生活 / 健康' },
      { value:'other', label:'其他 / 暂不好分类' }
    ];

const PROJECT_STATUS_OPTIONS = [
      { value:'active', label:'进行中' },
      { value:'paused', label:'暂停' },
      { value:'done', label:'已完成' }
    ];

const CARE_MOOD_OPTIONS = [
      { value:'overloaded', emoji:'😣', label:'压力拉满' },
      { value:'tense', emoji:'😕', label:'绷得很紧' },
      { value:'steady', emoji:'😐', label:'勉强平稳' },
      { value:'lighter', emoji:'🙂', label:'慢慢松开' },
      { value:'energized', emoji:'😊', label:'有一点能量' }
    ];

const MENTOR_STATUS_OPTIONS = [
      { value:'drafting', emoji:'📝', label:'准备汇报' },
      { value:'reported', emoji:'📤', label:'已汇报' },
      { value:'meeting', emoji:'🗣️', label:'已沟通 / 已开会' },
      { value:'waiting', emoji:'⏳', label:'等待反馈' },
      { value:'blocked', emoji:'🚩', label:'需要主动推进' }
    ];

const MENTOR_PROMISE_STATUS_OPTIONS = [
      { value:'open', label:'待核对', color:'bg-yellow-100 text-yellow-800' },
      { value:'confirmed', label:'已确认待兑现', color:'bg-sky-100 text-sky-700' },
      { value:'remind', label:'需再次提醒', color:'bg-rose-100 text-rose-700' },
      { value:'resolved', label:'已落实', color:'bg-emerald-100 text-emerald-700' }
    ];

const MENTOR_CHANNEL_OPTIONS = ['', '面谈', '邮件 / 微信', '文稿批注', '组会', '其他'];

const REVIEW_ENERGY_OPTIONS = [
      { value:'high', emoji:'☀️', label:'高：可以攻坚', short:'高', color:'text-dopamine-orange' },
      { value:'medium', emoji:'😐', label:'中：稳定推进', short:'中', color:'text-dopamine-sky' },
      { value:'low', emoji:'🌧️', label:'低：需要降载', short:'低', color:'text-dopamine-purple' }
    ];

const DEFAULT_HABITS = [
      { id:'habit_early_sleep', name:'早睡', icon:'🌙', mode:'time', enabled:true, locked:false },
      { id:'habit_early_wake', name:'早起', icon:'🌞', mode:'time', enabled:true, locked:false },
      { id:'habit_exercise', name:'运动', icon:'🏃', mode:'duration', enabled:true, locked:false },
      { id:'habit_food_record', name:'饮食记录', icon:'🍽️', mode:'food', enabled:true, locked:false }
    ];

const LEGACY_REMOVED_HABITS = new Set(['habit_reading','habit_writing','habit_phone_control','habit_food_journal','habit_mind_record']);

const $ = (id) => document.getElementById(id);

const sections = ['home-section','workflow-section','thesis-section','submission-section','habit-section','care-section','mentor-section','review-section','achievement-section','dashboard-section','settings-section'];

const charts = { focus:null, attendance:null, habit:null, thesis:null, wellbeing:null, submission:null };

const PREF_SIDEBAR_HIDDEN_KEY = `${STORAGE_KEY}__sidebar_hidden`;

const PREF_STATS_MODE_KEY = `${STORAGE_KEY}__stats_mode`;

let currentSection = 'home-section';

let focusInterval = null;

let selectedCareMood = 'steady';

let editContext = null;

let sidebarHidden = false;

let statsMode = 'day';

let workflowSelectedProjectId = '';
