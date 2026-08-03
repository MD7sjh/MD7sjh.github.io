/* Savings planning module. */
.savings-wish-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(236, 220, 229, .9);
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255,255,255,.97), rgba(255,248,251,.94));
  box-shadow: 0 18px 42px -30px rgba(114, 78, 98, .32);
}
.savings-wish-card::after {
  content: '';
  position: absolute;
  width: 92px;
  height: 92px;
  right: -34px;
  top: -34px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(244,154,176,.18), rgba(184,164,227,.04) 68%, transparent 70%);
  pointer-events: none;
}
.savings-progress-track {
  height: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: #F5EEF2;
}
.savings-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #F49AB0, #F6C96B, #72C7A2);
  transition: width .28s ease;
}
.savings-entry-row { border-radius: 18px; }
.savings-kpi { background: linear-gradient(155deg, rgba(255,255,255,.98), rgba(249,246,255,.92)); }
.savings-mini-note {
  border: 1px dashed #E8D8E2;
  border-radius: 18px;
  background: rgba(255,250,252,.78);
}
@media (max-width: 640px) {
  .savings-wish-card { border-radius: 20px; }
}
