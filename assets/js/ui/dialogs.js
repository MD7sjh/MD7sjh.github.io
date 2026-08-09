/* Reusable editing dialog and record editors. */
'use strict';

function openEditDialog(config) {
  editContext = config;
  $('editDialogTitle').textContent = config.title || '编辑记录';
  $('editDialogDesc').textContent = config.desc || '';
  $('editDialogBody').innerHTML = (config.fields || []).map(field => {
    if (field.type === 'textarea') {
      return `<label class="block"><div class="text-sm font-bold mb-1">${field.label}</div><textarea data-edit-field="${field.name}" rows="${field.rows||4}" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-white">${escapeHtml(field.value||'')}</textarea></label>`;
    }
    if (field.type === 'select') {
      const options = Array.isArray(field.options) ? field.options : [];
      const current = String(field.value ?? '');
      const html = options.map(opt => {
        const value = String(opt?.value ?? '');
        const label = String(opt?.label ?? value);
        return `<option value="${escapeHtml(value)}" ${value===current ? 'selected' : ''}>${escapeHtml(label)}</option>`;
      }).join('');
      return `<label class="block"><div class="text-sm font-bold mb-1">${field.label}</div><select data-edit-field="${field.name}" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-white font-semibold">${html}</select></label>`;
    }
    return `<label class="block"><div class="text-sm font-bold mb-1">${field.label}</div><input data-edit-field="${field.name}" type="${field.type||'text'}" value="${escapeHtml(field.value||'')}" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-white"></label>`;
  }).join('');
  $('btnDeleteRecord').style.display = config.onDelete ? 'inline-flex' : 'none';
  $('editDialog').showModal();
}
function closeEditDialog() { $('editDialog').close(); editContext = null; }
function collectEditValues() {
  const vals = {};
  $('editDialogBody').querySelectorAll('[data-edit-field]').forEach(el => vals[el.dataset.editField] = el.value);
  return vals;
}
function openProjectEditor(id) {
  const project = state.projects.find(item => item.id===id); if (!project) return;
  openEditDialog({
    title:'修改项目',
    desc:project.title,
    fields:[
      { name:'title', label:'项目名', value:project.title },
      { name:'outcome', label:'完成结果', value:project.outcome },
      { name:'area', label:'项目类别', type:'select', value:project.area, options:PROJECT_AREAS.map(item => ({ value:item.value, label:item.label })) },
      { name:'status', label:'项目状态', type:'select', value:project.status, options:PROJECT_STATUS_OPTIONS.map(item => ({ value:item.value, label:item.label })) },
      { name:'startDate', label:'开始日期', type:'date', value:project.startDate || dateFromDateTime(project.createdAt) || '' },
      { name:'deadline', label:'截止日期', type:'date', value:project.deadline || '' },
      { name:'note', label:'备注', type:'textarea', value:project.note || '' }
    ],
    onSave:(vals)=>{
      project.title = vals.title.trim() || project.title;
      project.outcome = vals.outcome.trim();
      project.area = projectAreaMeta(vals.area).value;
      project.status = projectStatusMeta(vals.status).value;
      project.startDate = vals.startDate || '';
      project.deadline = vals.deadline || '';
      project.note = vals.note || '';
      project.updatedAt = nowDateTime();
      saveState(); renderAll();
    },
    onDelete:()=>{
      state.tasks = state.tasks.map(item => item.projectId === id ? { ...item, projectId:'' } : item);
      state.projects = state.projects.filter(item => item.id !== id);
      saveState(); renderAll();
    }
  });
}
function openTaskEditor(id) {
  const task = state.tasks.find(item => item.id===id); if (!task) return;
  openEditDialog({
    title:'修改任务', desc:task.status==='done'?'已完成任务':'任务信息',
    fields:[
      { name:'title', label:'任务名称', value:task.title },
      { name:'projectId', label:'所属项目', type:'select', value:task.projectId || '', options:[{ value:'', label:'未关联项目' }, ...state.projects.map(project => ({ value:project.id, label:project.title }))] },
      { name:'quadrant', label:'紧急程度（4 象限）', type:'select', value:task.quadrant || 'q2', options:QUADRANT_OPTIONS.map(item => ({ value:item.value, label:item.label })) },
      { name:'status', label:'状态', type:'select', value:task.status, options:TASK_STATUS_OPTIONS.map(item => ({ value:item.value, label:item.label })) },
      { name:'joinToday', label:'加入今日执行', type:'select', value:task.todayBucket ? 'yes' : 'no', options:[{ value:'no', label:'否' }, { value:'yes', label:'是' }] },
      { name:'dueDate', label:'截止日期', type:'date', value:task.dueDate || '' },
      { name:'estimate', label:'预计分钟', value:String(task.estimate || '') }
    ],
    onSave:(vals)=>{
      const wasDone = task.status === 'done';
      task.title = vals.title.trim() || task.title;
      task.projectId = vals.projectId || '';
      task.quadrant = taskQuadrantMeta(vals.quadrant).value;
      task.dueDate = vals.dueDate || '';
      task.estimate = Math.max(0, Number(vals.estimate) || 0);
      const nextStatus = taskStatusMeta(vals.status).value;
      if (nextStatus === 'done' && !wasDone) {
        finishTask(task.id);
        return;
      }
      task.status = nextStatus;
      if (nextStatus === 'done') {
        task.gtdBucket = 'done';
        task.todayBucket = '';
        task.doneAt = task.doneAt || nowDateTime();
      } else {
        task.gtdBucket = task.projectId ? 'next' : 'inbox';
        task.todayBucket = vals.joinToday === 'yes' ? (task.todayBucket || 'should') : '';
        task.doneAt = '';
        if (nextStatus === 'active') task.startedAt = task.startedAt || nowDateTime();
      }
      saveState(); renderAll();
    },
    onDelete:()=>{ deleteTask(id); }
  });
}
function openWorkLogEditor(id) {
  const day = getDayAttendance(); const item = day.logs.find(log => log.id===id); if (!item) return;
  openEditDialog({ title:'修改工作打卡', desc: dayLabel(item.date), fields:[{name:'start',label:'开始时间',type:'time',value:item.start},{name:'end',label:'结束时间',type:'time',value:item.end||''}], onSave:(vals)=>{ item.start=parseHM(vals.start)||item.start; item.end=parseHM(vals.end)||null; saveState(); renderAll(); }, onDelete:()=>{ day.logs = day.logs.filter(log => log.id!==id); saveState(); renderAll(); } });
}
function openLeaveEditor(id) {
  const day = getDayAttendance(); const item = day.leaves.find(v => v.id===id); if (!item) return;
  openEditDialog({ title:'修改请假记录', desc: dayLabel(item.date), fields:[{name:'type',label:'请假类型',value:item.type}], onSave:(vals)=>{ item.type = vals.type.trim() || item.type; saveState(); renderAll(); }, onDelete:()=>{ day.leaves = day.leaves.filter(v => v.id!==id); saveState(); renderAll(); } });
}
function openFocusEditor(id) {
  const item = state.focus.sessions.find(v => v.id===id); if (!item) return;
  openEditDialog({ title:'修改专注记录', desc:item.date, fields:[{name:'date',label:'日期',type:'date',value:item.date},{name:'title',label:'主题',value:item.title},{name:'start',label:'开始时间',type:'time',value:item.start},{name:'end',label:'结束时间',type:'time',value:item.end}], onSave:(vals)=>{ item.date = vals.date || item.date; item.title = vals.title.trim() || item.title; item.start = parseHM(vals.start)||item.start; item.end = parseHM(vals.end)||item.end; item.minutes = minutesBetween(item.start,item.end); saveState(); renderAll(); }, onDelete:()=>{ state.focus.sessions = state.focus.sessions.filter(v => v.id!==id); saveState(); renderAll(); } });
}
function openBlockEditor(id,date) {
  const blocks = getDayTimeBlocks(date); const item = blocks.find(v => v.id===id); if (!item) return;
  openEditDialog({ title:'修改日程安排', desc:date, fields:[{name:'date',label:'日期',type:'date',value:date},{name:'title',label:'标题',value:item.title},{name:'start',label:'开始时间',type:'time',value:item.start},{name:'end',label:'结束时间',type:'time',value:item.end}], onSave:(vals)=>{ const targetDate = vals.date || date; item.title = vals.title.trim() || item.title; item.start = parseHM(vals.start)||item.start; item.end = parseHM(vals.end)||item.end; if (targetDate !== date) { state.timeBlocks[date] = blocks.filter(v => v.id!==id); getDayTimeBlocks(targetDate).push(item); } saveState(); $('scheduleDate').value = targetDate; renderAll(); }, onDelete:()=>{ state.timeBlocks[date] = blocks.filter(v => v.id!==id); saveState(); renderAll(); } });
}
function openSubmissionEditor(id) {
  const item = state.submissions.find(v => v.id===id); if (!item) return;
  openEditDialog({ title:'修改投稿项目', desc:item.venue || '', fields:[{name:'title',label:'题目',value:item.title},{name:'venue',label:'Venue',value:item.venue||''},{name:'deadline',label:'截止日期',type:'date',value:item.deadline||''},{name:'stage',label:'阶段',value:item.stage||''},{name:'notes',label:'备注',type:'textarea',value:item.notes||''}], onSave:(vals)=>{ item.title = vals.title.trim() || item.title; item.venue = vals.venue.trim(); item.deadline = vals.deadline || ''; item.stage = SUBMISSION_COLUMNS.includes(vals.stage) ? vals.stage : item.stage; item.notes = vals.notes || ''; item.updatedAt = nowDateTime(); syncSubmissionProject(item); saveState(); renderAll(); }, onDelete:()=>{ state.submissions = state.submissions.filter(v => v.id!==id); state.projects = state.projects.filter(project => project.note !== submissionProjectNote(id)); saveState(); renderAll(); } });
}
