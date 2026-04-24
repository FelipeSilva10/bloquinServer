#!/usr/bin/env python3
"""
bloquin-control.py — Painel de controle do servidor Bloquin v2.0
Redesign: alta legibilidade, mais informações, melhor hierarquia visual.

Dependências: python-gobject (GTK3)
Instalar: sudo pacman -S python-gobject gtk3
"""

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, GLib, Gdk, Pango

import subprocess
import threading
import os
import signal
import json
import urllib.request
import urllib.error
import time
import webbrowser
from pathlib import Path

# ── Configuração ──────────────────────────────────────────────────────────────

SERVER_DIR    = str(Path(__file__).resolve().parent)
SERVER_CMD    = ['/home/felipe/.nvm/versions/node/v24.14.0/bin/node', '--env-file=.env', 'server/index.js']
SERVER_PORT   = 3000
HOTSPOT_IF    = 'wlp0s20f3'
HOTSPOT_IP    = '10.42.0.1'
HOTSPOT_SSID  = 'Bloquin'
HOTSPOT_PASS  = 'robotica123'
REFRESH_MS    = 3000

CSS = """
* {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace;
}

window {
    background-color: #111111;
}

/* ═══════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════ */

#header {
    background-color: #1a1a1a;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: #2a2a2a;
    padding: 12px 18px;
}

#header-dot {
    background-color: #22c55e;
    border-radius: 50px;
    min-width: 10px;
    min-height: 10px;
    margin-right: 10px;
}

#header-dot-off {
    background-color: #333333;
    border-radius: 50px;
    min-width: 10px;
    min-height: 10px;
    margin-right: 10px;
}

#app-name {
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
}

#app-subtitle {
    color: #555555;
    font-size: 9px;
    letter-spacing: 2px;
    margin-top: 1px;
}

/* ═══════════════════════════════════════════════════
   SEÇÃO: label de separação
════════════════════════════════════════════════════ */

#section-label {
    color: #444444;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 3px;
    margin-bottom: 6px;
}

/* ═══════════════════════════════════════════════════
   BOTÃO PRINCIPAL
════════════════════════════════════════════════════ */

#btn-wrap {
    padding: 16px 18px 12px 18px;
    background-color: #111111;
}

#main-btn {
    border-radius: 6px;
    border-width: 2px;
    border-style: solid;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 3px;
    padding: 18px 0;
    font-family: 'JetBrains Mono', monospace;
}

#main-btn.off {
    background-color: #1a1a1a;
    color: #cccccc;
    border-color: #333333;
}

#main-btn.on {
    background-color: #14532d;
    color: #ffffff;
    border-color: #22c55e;
}

#main-btn.busy {
    background-color: #1c1c00;
    color: #facc15;
    border-color: #713f12;
}

#main-btn.stopping {
    background-color: #1f0000;
    color: #f87171;
    border-color: #7f1d1d;
}

/* ═══════════════════════════════════════════════════
   SERVIÇOS
════════════════════════════════════════════════════ */

#services-wrap {
    padding: 0 18px 14px 18px;
}

#service-card {
    background-color: #1a1a1a;
    border-width: 1px;
    border-style: solid;
    border-color: #2a2a2a;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 6px;
}

#service-card-on {
    background-color: #0c1f12;
    border-width: 1px;
    border-style: solid;
    border-color: #22c55e;
    border-left-width: 3px;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 6px;
}

#service-card-err {
    background-color: #1f0c0c;
    border-width: 1px;
    border-style: solid;
    border-color: #ef4444;
    border-left-width: 3px;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 6px;
}

#svc-name {
    color: #ebe6e6;
    font-size: 13px;
    font-weight: 700;
}

#svc-detail {
    color: #555555;
    font-size: 9px;
    margin-top: 2px;
}

#svc-detail-on {
    color: #4ade80;
    font-size: 9px;
    margin-top: 2px;
}

#badge-off {
    background-color: #222222;
    border-width: 1px;
    border-style: solid;
    border-color: #333333;
    border-radius: 4px;
    padding: 3px 9px;
    color: #555555;
    font-size: 9px;
    letter-spacing: 1px;
}

#badge-on {
    background-color: #14532d;
    border-width: 1px;
    border-style: solid;
    border-color: #22c55e;
    border-radius: 4px;
    padding: 3px 9px;
    color: #86efac;
    font-size: 9px;
    letter-spacing: 1px;
    font-weight: 700;
}

#badge-err {
    background-color: #450a0a;
    border-width: 1px;
    border-style: solid;
    border-color: #ef4444;
    border-radius: 4px;
    padding: 3px 9px;
    color: #fca5a5;
    font-size: 9px;
    letter-spacing: 1px;
    font-weight: 700;
}

/* ═══════════════════════════════════════════════════
   URL DOS ALUNOS
════════════════════════════════════════════════════ */

#url-wrap {
    padding: 0 18px 14px 18px;
}

#url-card {
    background-color: #111820;
    border-width: 1px;
    border-style: solid;
    border-color: #1e3a5f;
    border-radius: 6px;
    padding: 14px;
}

#url-card-off {
    background-color: #1a1a1a;
    border-width: 1px;
    border-style: solid;
    border-color: #2a2a2a;
    border-radius: 6px;
    padding: 14px;
}

#url-eyebrow {
    color: #3b82f6;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 4px;
}

#url-eyebrow-off {
    color: #444444;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 4px;
}

#url-text {
    color: #93c5fd;
    font-size: 15px;
    font-weight: 700;
}

#url-text-off {
    color: #333333;
    font-size: 15px;
    font-weight: 700;
}

#copy-btn {
    background-color: #1e3a5f;
    border-width: 1px;
    border-style: solid;
    border-color: #3b82f6;
    border-radius: 4px;
    color: #93c5fd;
    font-size: 9px;
    letter-spacing: 1px;
    padding: 5px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
}

#copy-btn-off {
    background-color: #1a1a1a;
    border-width: 1px;
    border-style: solid;
    border-color: #2a2a2a;
    border-radius: 4px;
    color: #444444;
    font-size: 9px;
    letter-spacing: 1px;
    padding: 5px 12px;
    font-family: 'JetBrains Mono', monospace;
}

/* ═══════════════════════════════════════════════════
   STATS
════════════════════════════════════════════════════ */

#stats-wrap {
    padding: 0 18px 14px 18px;
}

#stat-card {
    background-color: #1a1a1a;
    border-width: 1px;
    border-style: solid;
    border-color: #2a2a2a;
    border-radius: 6px;
    padding: 14px 6px;
}

#stat-number {
    font-size: 30px;
    font-weight: 700;
    color: #ffffff;
}

#stat-number.green  { color: #22c55e; }
#stat-number.amber  { color: #f59e0b; }
#stat-number.blue   { color: #60a5fa; }
#stat-number.muted  { color: #333333; }

#stat-label {
    color: #444444;
    font-size: 7px;
    letter-spacing: 2px;
    margin-top: 2px;
}

/* ═══════════════════════════════════════════════════
   LOG
════════════════════════════════════════════════════ */

#log-wrap {
    padding: 0 18px 18px 18px;
}

#log-outer {
    background-color: #0d0d0d;
    border-width: 1px;
    border-style: solid;
    border-color: #222222;
    border-radius: 6px;
}

#log-topbar {
    background-color: #161616;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: #222222;
    border-radius: 6px 6px 0 0;
    padding: 7px 12px;
}

#log-topbar-label {
    color: #444444;
    font-size: 8px;
    letter-spacing: 2px;
}

#log-pid-label {
    color: #333333;
    font-size: 8px;
}

textview {
    background-color: #0d0d0d;
    color: #555555;
    font-size: 9px;
}

textview text {
    background-color: #0d0d0d;
}

/* ═══════════════════════════════════════════════════
   ATALHOS
════════════════════════════════════════════════════ */

#shortcuts-wrap {
    padding: 0 18px 14px 18px;
}

#shortcut-btn {
    background-color: #111820;
    border-width: 1px;
    border-style: solid;
    border-color: #1e3a5f;
    border-radius: 6px;
    color: #60a5fa;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    padding: 10px 14px;
}

#shortcut-btn:hover {
    background-color: #1e3a5f;
    border-color: #3b82f6;
}

#shortcut-btn-off {
    background-color: #1a1a1a;
    border-width: 1px;
    border-style: solid;
    border-color: #2a2a2a;
    border-radius: 6px;
    color: #333333;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    padding: 10px 14px;
}

/* ═══════════════════════════════════════════════════
   SCROLLBAR
════════════════════════════════════════════════════ */

scrollbar {
    background-color: #0d0d0d;
    min-width: 6px;
}

scrollbar slider {
    background-color: #2a2a2a;
    border-radius: 3px;
    min-width: 4px;
    min-height: 4px;
}
"""


class BloquinControl(Gtk.Window):

    def __init__(self):
        super().__init__(title='Bloquin Control')
        self.set_default_size(420, 680)
        self.set_resizable(True)
        self.set_position(Gtk.WindowPosition.CENTER)

        self.server_proc  = None
        self.hotspot_on   = False
        self.server_on    = False
        self.starting     = False
        self.stopping     = False
        self.session_start = None
        self._server_pid  = None

        css = Gtk.CssProvider()
        css.load_from_data(CSS.encode('utf-8'))
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), css,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self.connect('delete-event', self.on_close)
        self._build_ui()
        self._check_initial_state()
        GLib.timeout_add(REFRESH_MS, self._refresh_stats)

    # ═════════════════════════════════════════════════════════════════════════
    # CONSTRUÇÃO DA UI
    # ═════════════════════════════════════════════════════════════════════════

    def _build_ui(self):
        outer_scroll = Gtk.ScrolledWindow()
        outer_scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.add(outer_scroll)

        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        outer_scroll.add(root)

        root.pack_start(self._build_header(),    False, False, 0)
        root.pack_start(self._build_button(),    False, False, 0)
        root.pack_start(self._build_services(),  False, False, 0)
        root.pack_start(self._build_url(),       False, False, 0)
        root.pack_start(self._build_shortcuts(), False, False, 0)
        root.pack_start(self._build_stats(),     False, False, 0)
        root.pack_start(self._build_log(),       True,  True,  0)

        self.show_all()

    # ── Header ────────────────────────────────────────────────────────────────

    def _build_header(self):
        hdr = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        hdr.set_name('header')

        left = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)

        self.header_dot = Gtk.Box()
        self.header_dot.set_name('header-dot-off')
        self.header_dot.set_valign(Gtk.Align.CENTER)
        left.pack_start(self.header_dot, False, False, 0)

        titles = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        name = Gtk.Label(label='BLOQUIN CONTROL')
        name.set_name('app-name')
        name.set_halign(Gtk.Align.START)
        titles.pack_start(name, False, False, 0)
        left.pack_start(titles, False, False, 0)

        hdr.pack_start(left, True, True, 0)
        return hdr

    # ── Botão principal ───────────────────────────────────────────────────────

    def _build_button(self):
        wrap = Gtk.Box()
        wrap.set_name('btn-wrap')

        self.main_btn = Gtk.Button(label='▶   INICIAR AULA')
        self.main_btn.set_name('main-btn')
        self.main_btn.get_style_context().add_class('off')
        self.main_btn.connect('clicked', self.on_main_button)
        self.main_btn.set_hexpand(True)
        wrap.pack_start(self.main_btn, True, True, 0)
        return wrap

    # ── Serviços ─────────────────────────────────────────────────────────────

    def _build_services(self):
        wrap = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        wrap.set_name('services-wrap')

        lbl = Gtk.Label(label='SERVIÇOS')
        lbl.set_name('section-label')
        lbl.set_halign(Gtk.Align.START)
        wrap.pack_start(lbl, False, False, 0)

        # Card WiFi
        self.wifi_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.wifi_card.set_name('service-card')
        wifi_info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        wifi_title = Gtk.Label(label='WiFi Hotspot')
        wifi_title.set_name('svc-name')
        wifi_title.set_halign(Gtk.Align.START)
        self.wifi_detail = Gtk.Label(label=f'SSID: {HOTSPOT_SSID}  ·  Senha: {HOTSPOT_PASS}')
        self.wifi_detail.set_name('svc-detail')
        self.wifi_detail.set_halign(Gtk.Align.START)
        wifi_info.pack_start(wifi_title,      False, False, 0)
        wifi_info.pack_start(self.wifi_detail, False, False, 0)
        self.wifi_badge = Gtk.Label(label='INATIVO')
        self.wifi_badge.set_name('badge-off')
        self.wifi_badge.set_valign(Gtk.Align.CENTER)
        self.wifi_card.pack_start(wifi_info,      True, True,  0)
        self.wifi_card.pack_end(self.wifi_badge, False, False, 0)
        wrap.pack_start(self.wifi_card, False, False, 0)

        # Card Servidor
        self.srv_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.srv_card.set_name('service-card')
        srv_info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        srv_title = Gtk.Label(label='Servidor Node.js')
        srv_title.set_name('svc-name')
        srv_title.set_halign(Gtk.Align.START)
        self.srv_detail = Gtk.Label(label=f'Porta: {SERVER_PORT}  ·  PID: —')
        self.srv_detail.set_name('svc-detail')
        self.srv_detail.set_halign(Gtk.Align.START)
        srv_info.pack_start(srv_title,        False, False, 0)
        srv_info.pack_start(self.srv_detail,  False, False, 0)
        self.srv_badge = Gtk.Label(label='INATIVO')
        self.srv_badge.set_name('badge-off')
        self.srv_badge.set_valign(Gtk.Align.CENTER)
        self.srv_card.pack_start(srv_info,       True, True,  0)
        self.srv_card.pack_end(self.srv_badge,  False, False, 0)
        wrap.pack_start(self.srv_card, False, False, 0)

        return wrap

    # ── URL ───────────────────────────────────────────────────────────────────

    def _build_url(self):
        wrap = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        wrap.set_name('url-wrap')

        lbl = Gtk.Label(label='ACESSO DOS ALUNOS')
        lbl.set_name('section-label')
        lbl.set_halign(Gtk.Align.START)
        wrap.pack_start(lbl, False, False, 0)

        self.url_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.url_card.set_name('url-card-off')

        url_col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        self.url_eye = Gtk.Label(label='ENDEREÇO')
        self.url_eye.set_name('url-eyebrow-off')
        self.url_eye.set_halign(Gtk.Align.START)
        self.url_lbl = Gtk.Label(label=f'http://{HOTSPOT_IP}:{SERVER_PORT}')
        self.url_lbl.set_name('url-text-off')
        self.url_lbl.set_halign(Gtk.Align.START)
        self.url_lbl.set_selectable(True)
        url_col.pack_start(self.url_eye, False, False, 0)
        url_col.pack_start(self.url_lbl, False, False, 0)

        self.copy_btn = Gtk.Button(label='COPIAR')
        self.copy_btn.set_name('copy-btn-off')
        self.copy_btn.set_valign(Gtk.Align.CENTER)
        self.copy_btn.connect('clicked', self._copy_url)

        self.url_card.pack_start(url_col,       True, True,  0)
        self.url_card.pack_end(self.copy_btn,  False, False, 0)
        wrap.pack_start(self.url_card, False, False, 0)
        return wrap

    # ── Atalhos ───────────────────────────────────────────────────────────────

    def _build_shortcuts(self):
        wrap = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        wrap.set_name('shortcuts-wrap')

        lbl = Gtk.Label(label='ATALHOS')
        lbl.set_name('section-label')
        lbl.set_halign(Gtk.Align.START)
        wrap.pack_start(lbl, False, False, 0)

        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)

        self.btn_users = Gtk.Button(label='👤  USUÁRIOS')
        self.btn_users.set_name('shortcut-btn-off')
        self.btn_users.set_tooltip_text(f'Abrir http://localhost:{SERVER_PORT}/users.html')
        self.btn_users.connect('clicked', self._open_users)
        self.btn_users.set_hexpand(True)

        self.btn_hud = Gtk.Button(label='📊  PAINEL')
        self.btn_hud.set_name('shortcut-btn-off')
        self.btn_hud.set_tooltip_text(f'Abrir http://localhost:{SERVER_PORT}/hud.html')
        self.btn_hud.connect('clicked', self._open_hud)
        self.btn_hud.set_hexpand(True)

        row.pack_start(self.btn_users, True, True, 0)
        row.pack_start(self.btn_hud,   True, True, 0)
        wrap.pack_start(row, False, False, 0)
        return wrap

    def _open_users(self, _btn):
        if self.server_on:
            webbrowser.open(f'http://localhost:{SERVER_PORT}/users.html')
        else:
            self._log('Servidor inativo. Inicie a aula primeiro.', 'amber')

    def _open_hud(self, _btn):
        if self.server_on:
            webbrowser.open(f'http://localhost:{SERVER_PORT}/hud.html')
        else:
            self._log('Servidor inativo. Inicie a aula primeiro.', 'amber')

    # ── Stats ────────────────────────────────────────────────────────────────

    def _build_stats(self):
        wrap = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        wrap.set_name('stats-wrap')

        lbl = Gtk.Label(label='SALA DE AULA')
        lbl.set_name('section-label')
        lbl.set_halign(Gtk.Align.START)
        wrap.pack_start(lbl, False, False, 0)

        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self._stat_online    = self._make_stat('0',  'green', 'ONLINE')
        self._stat_compiling = self._make_stat('0',  'amber', 'COMPILANDO')
        self._stat_projects  = self._make_stat('0',  'blue',  'PROJETOS')
        self._stat_uptime    = self._make_stat('—',  'muted', 'UPTIME')
        row.pack_start(self._stat_online[0],    True, True, 0)
        row.pack_start(self._stat_compiling[0], True, True, 0)
        row.pack_start(self._stat_projects[0],  True, True, 0)
        row.pack_start(self._stat_uptime[0],    True, True, 0)
        wrap.pack_start(row, False, False, 0)
        return wrap

    def _make_stat(self, val, color, label):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        box.set_name('stat-card')
        num = Gtk.Label(label=val)
        num.set_name('stat-number')
        num.get_style_context().add_class(color)
        sub = Gtk.Label(label=label)
        sub.set_name('stat-label')
        box.pack_start(num, False, False, 0)
        box.pack_start(sub, False, False, 0)
        return box, num

    # ── Log ──────────────────────────────────────────────────────────────────

    def _build_log(self):
        wrap = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        wrap.set_name('log-wrap')

        lbl = Gtk.Label(label='LOG DO SERVIDOR')
        lbl.set_name('section-label')
        lbl.set_halign(Gtk.Align.START)
        wrap.pack_start(lbl, False, False, 0)

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        outer.set_name('log-outer')

        topbar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        topbar.set_name('log-topbar')
        tbl = Gtk.Label(label='SAÍDA DO PROCESSO')
        tbl.set_name('log-topbar-label')
        self.pid_lbl = Gtk.Label(label='PID: —')
        self.pid_lbl.set_name('log-pid-label')
        topbar.pack_start(tbl,          False, False, 0)
        topbar.pack_end(self.pid_lbl,   False, False, 0)
        outer.pack_start(topbar, False, False, 0)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_min_content_height(170)

        self.log_buf  = Gtk.TextBuffer()
        self.log_view = Gtk.TextView(buffer=self.log_buf)
        self.log_view.set_editable(False)
        self.log_view.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
        self.log_view.set_cursor_visible(False)
        self.log_view.set_left_margin(12)
        self.log_view.set_right_margin(12)
        self.log_view.set_top_margin(8)
        self.log_view.set_bottom_margin(8)

        # Tags de cor
        self.log_buf.create_tag('green',  foreground='#22c55e')
        self.log_buf.create_tag('amber',  foreground='#f59e0b')
        self.log_buf.create_tag('red',    foreground='#ef4444')
        self.log_buf.create_tag('blue',   foreground='#60a5fa')
        self.log_buf.create_tag('white',  foreground='#cccccc')
        self.log_buf.create_tag('muted',  foreground='#555555')
        self.log_buf.create_tag('ts',     foreground='#2a2a2a')
        self.log_buf.create_tag('prefix', foreground='#333333')

        scroll.add(self.log_view)
        outer.pack_start(scroll, True, True, 0)
        wrap.pack_start(outer, True, True, 0)
        return wrap

    # ═════════════════════════════════════════════════════════════════════════
    # LÓGICA PRINCIPAL
    # ═════════════════════════════════════════════════════════════════════════

    def on_main_button(self, btn):
        if self.starting or self.stopping:
            return
        if self.server_on or self.hotspot_on:
            self._stop_all()
        else:
            self._start_all()

    # ── Iniciar ───────────────────────────────────────────────────────────────

    def _start_all(self):
        self.starting = True
        self._set_btn_state('busy', '⌛   INICIANDO...')
        self._log('Iniciando hotspot WiFi...', 'muted')

        def worker():
            ok_h = self._hotspot_up()
            GLib.idle_add(self._update_wifi_ui, ok_h)
            if ok_h:
                time.sleep(1)
                self._log(f'Hotspot "{HOTSPOT_SSID}" ativo.', 'green')
            else:
                self._log('Hotspot falhou — continuando sem WiFi.', 'amber')
            ok_s = self._server_start()
            GLib.idle_add(self._update_srv_ui, ok_s)
            GLib.idle_add(self._finish_start, ok_h, ok_s)

        threading.Thread(target=worker, daemon=True).start()

    def _finish_start(self, ok_h, ok_s):
        self.starting = False
        if ok_s:
            self.session_start = time.time()
            self._set_btn_state('on', '■   ENCERRAR AULA')
            ip  = self._get_hotspot_ip()
            url = f'http://{ip}:{SERVER_PORT}'
            self.url_lbl.set_label(url)
            self._set_url_active(True)
            self.header_dot.set_name('header-dot')
            self._log(f'Tudo pronto! URL dos alunos: {url}', 'green')
        else:
            self._set_btn_state('off', '▶   INICIAR AULA')
            self._set_url_active(False)
            self._log('Falha ao iniciar. Verifique o log acima.', 'red')

    # ── Parar ─────────────────────────────────────────────────────────────────

    def _stop_all(self):
        self.stopping = True
        self._set_btn_state('stopping', '⏹   ENCERRANDO...')
        self._log('Encerrando sessão de aula...', 'amber')

        def worker():
            self._server_stop()
            GLib.idle_add(self._update_srv_ui, False)
            time.sleep(0.5)
            self._hotspot_down()
            GLib.idle_add(self._update_wifi_ui, False)
            GLib.idle_add(self._finish_stop)

        threading.Thread(target=worker, daemon=True).start()

    def _finish_stop(self):
        self.stopping     = False
        self.session_start = None
        self._set_btn_state('off', '▶   INICIAR AULA')
        self._set_url_active(False)
        self._reset_stats()
        self.header_dot.set_name('header-dot-off')
        self.pid_lbl.set_label('PID: —')
        self._log('Sessão encerrada.', 'muted')

    # ── Estado do botão ───────────────────────────────────────────────────────

    def _set_btn_state(self, css_class, label):
        ctx = self.main_btn.get_style_context()
        for c in ('off', 'on', 'busy', 'stopping'):
            ctx.remove_class(c)
        ctx.add_class(css_class)
        self.main_btn.set_label(label)

    # ═════════════════════════════════════════════════════════════════════════
    # HOTSPOT
    # ═════════════════════════════════════════════════════════════════════════

    def _hotspot_up(self):
        r = subprocess.run(
            ['nmcli', 'connection', 'up', 'Hotspot'],
            capture_output=True, text=True
        )
        if r.returncode == 0:
            self.hotspot_on = True
            return True
        r2 = subprocess.run([
            'nmcli', 'device', 'wifi', 'hotspot',
            'ifname', HOTSPOT_IF,
            'ssid',   HOTSPOT_SSID,
            'password', HOTSPOT_PASS,
            'band', 'bg'
        ], capture_output=True, text=True)
        if r2.returncode == 0:
            self.hotspot_on = True
            return True
        self._log(f'Erro hotspot: {r2.stderr.strip()}', 'red')
        return False

    def _hotspot_down(self):
        subprocess.run(['nmcli', 'connection', 'down', 'Hotspot'], capture_output=True)
        self.hotspot_on = False
        self._log('Hotspot desligado.', 'muted')

    def _get_hotspot_ip(self):
        try:
            r = subprocess.run(
                ['ip', '-4', 'addr', 'show', HOTSPOT_IF],
                capture_output=True, text=True
            )
            for line in r.stdout.split('\n'):
                if 'inet ' in line:
                    return line.strip().split()[1].split('/')[0]
        except Exception:
            pass
        return HOTSPOT_IP

    # ═════════════════════════════════════════════════════════════════════════
    # SERVIDOR
    # ═════════════════════════════════════════════════════════════════════════

    def _server_start(self):
        try:
            self.server_proc = subprocess.Popen(
                SERVER_CMD,
                cwd=SERVER_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=os.environ.copy(),
                preexec_fn=os.setsid
            )
            for _ in range(18):
                time.sleep(0.5)
                if self._server_alive():
                    self.server_on   = True
                    self._server_pid = self.server_proc.pid
                    GLib.idle_add(self.pid_lbl.set_label, f'PID: {self._server_pid}')
                    GLib.idle_add(
                        self.srv_detail.set_label,
                        f'Porta: {SERVER_PORT}  ·  PID: {self._server_pid}'
                    )
                    self._log(f'Servidor ativo — PID {self._server_pid}', 'green')
                    threading.Thread(target=self._tail_server_log, daemon=True).start()
                    return True
            self._log('Servidor não respondeu em 9s.', 'red')
            return False
        except Exception as e:
            self._log(f'Erro ao iniciar servidor: {e}', 'red')
            return False

    def _server_stop(self):
        if self.server_proc:
            try:
                os.killpg(os.getpgid(self.server_proc.pid), signal.SIGTERM)
                self.server_proc.wait(timeout=5)
            except Exception:
                try:
                    self.server_proc.kill()
                except Exception:
                    pass
            self.server_proc  = None
            self._server_pid  = None
        self.server_on = False
        GLib.idle_add(self.srv_detail.set_label, f'Porta: {SERVER_PORT}  ·  PID: —')
        self._log('Servidor encerrado.', 'muted')

    def _server_alive(self):
        try:
            urllib.request.urlopen(f'http://localhost:{SERVER_PORT}/health', timeout=1)
            return True
        except Exception:
            return False

    def _tail_server_log(self):
        if not self.server_proc:
            return
        for line in self.server_proc.stdout:
            line = line.strip()
            if not line:
                continue
            ll = line.lower()
            if any(k in ll for k in ('erro', 'error', 'fail', 'fatal')):
                color = 'red'
            elif any(k in ll for k in ('compilando', 'compil', 'fila')):
                color = 'amber'
            elif any(k in ll for k in ('concluído', 'rodando', 'pronto', 'listen')):
                color = 'green'
            elif any(k in ll for k in ('conectou', 'login', 'desconect')):
                color = 'blue'
            else:
                color = 'muted'
            self._log(f'srv › {line}', color)

    # ═════════════════════════════════════════════════════════════════════════
    # STATS
    # ═════════════════════════════════════════════════════════════════════════

    def _refresh_stats(self):
        if self.server_on:
            threading.Thread(target=self._fetch_stats, daemon=True).start()
        elif self.server_proc and self.server_proc.poll() is not None:
            self.server_on = False
            GLib.idle_add(self._update_srv_ui, False)
            self._log('Servidor encerrou inesperadamente!', 'red')
        return True

    def _fetch_stats(self):
        try:
            data = json.loads(
                urllib.request.urlopen(
                    f'http://localhost:{SERVER_PORT}/api/admin/local-stats', timeout=2
                ).read()
            )
            online    = data.get('online',    0)
            compiling = data.get('compiling', 0)
            projects  = data.get('projects',  0)
            uptime    = int(data.get('uptime', 0))
            GLib.idle_add(self._update_stats_ui, online, compiling, projects, uptime)
        except Exception:
            pass

    def _update_stats_ui(self, online, compiling, projects, uptime):
        self._stat_online[1].set_text(str(online))
        self._stat_compiling[1].set_text(str(compiling))
        self._stat_projects[1].set_text(str(projects))
        h = uptime // 3600
        m = (uptime % 3600) // 60
        s = uptime % 60
        self._stat_uptime[1].set_text(f'{h}h{m:02d}' if h else f'{m}m{s:02d}s')

    def _reset_stats(self):
        self._stat_online[1].set_text('0')
        self._stat_compiling[1].set_text('0')
        self._stat_projects[1].set_text('0')
        self._stat_uptime[1].set_text('—')

    # ═════════════════════════════════════════════════════════════════════════
    # UI HELPERS
    # ═════════════════════════════════════════════════════════════════════════

    def _update_wifi_ui(self, on):
        self.hotspot_on = on
        if on:
            self.wifi_card.set_name('service-card-on')
            self.wifi_badge.set_name('badge-on')
            self.wifi_badge.set_label('ATIVO')
            self.wifi_detail.set_name('svc-detail-on')
        else:
            self.wifi_card.set_name('service-card')
            self.wifi_badge.set_name('badge-off')
            self.wifi_badge.set_label('INATIVO')
            self.wifi_detail.set_name('svc-detail')

    def _update_srv_ui(self, on):
        self.server_on = on
        if on:
            self.srv_card.set_name('service-card-on')
            self.srv_badge.set_name('badge-on')
            self.srv_badge.set_label('RODANDO')
            self.btn_users.set_name('shortcut-btn')
            self.btn_hud.set_name('shortcut-btn')
        else:
            self.srv_card.set_name('service-card')
            self.srv_badge.set_name('badge-off')
            self.srv_badge.set_label('INATIVO')
            self.btn_users.set_name('shortcut-btn-off')
            self.btn_hud.set_name('shortcut-btn-off')

    def _set_url_active(self, active):
        if active:
            self.url_card.set_name('url-card')
            self.url_eye.set_name('url-eyebrow')
            self.url_lbl.set_name('url-text')
            self.copy_btn.set_name('copy-btn')
        else:
            self.url_card.set_name('url-card-off')
            self.url_eye.set_name('url-eyebrow-off')
            self.url_lbl.set_name('url-text-off')
            self.copy_btn.set_name('copy-btn-off')

    def _copy_url(self, _btn):
        cb = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)
        cb.set_text(self.url_lbl.get_label(), -1)
        self.copy_btn.set_label('✓ COPIADO')
        GLib.timeout_add(1800, lambda: self.copy_btn.set_label('COPIAR') or False)

    def _log(self, msg, color='muted'):
        ts = time.strftime('%H:%M:%S')

        def _append():
            end = self.log_buf.get_end_iter()
            self.log_buf.insert_with_tags_by_name(end, f'{ts}  ', 'ts')
            self.log_buf.insert_with_tags_by_name(end, f'{msg}\n', color)
            mark = self.log_buf.create_mark(None, self.log_buf.get_end_iter(), False)
            self.log_view.scroll_to_mark(mark, 0.0, True, 0.0, 1.0)
            return False

        GLib.idle_add(_append)

    # ═════════════════════════════════════════════════════════════════════════
    # ESTADO INICIAL
    # ═════════════════════════════════════════════════════════════════════════

    def _check_initial_state(self):
        def check():
            r = subprocess.run(
                ['nmcli', '-t', '-f', 'NAME,STATE', 'connection', 'show', '--active'],
                capture_output=True, text=True
            )
            if 'Hotspot:activated' in r.stdout or 'Hotspot:activating' in r.stdout:
                GLib.idle_add(self._update_wifi_ui, True)
                self._log('Hotspot já está ativo.', 'green')

            if self._server_alive():
                self.server_on    = True
                self.session_start = time.time()
                GLib.idle_add(self._update_srv_ui, True)
                GLib.idle_add(self._finish_start, True, True)
            else:
                self._log('Aguardando início. Clique em INICIAR AULA.', 'muted')

        threading.Thread(target=check, daemon=True).start()

    # ═════════════════════════════════════════════════════════════════════════
    # FECHAR
    # ═════════════════════════════════════════════════════════════════════════

    def on_close(self, *_):
        if self.server_on or self.hotspot_on:
            dlg = Gtk.MessageDialog(
                transient_for=self,
                flags=0,
                message_type=Gtk.MessageType.QUESTION,
                buttons=Gtk.ButtonsType.NONE,
                text='Encerrar tudo ao fechar?'
            )
            dlg.format_secondary_text(
                'O servidor e/ou o hotspot ainda estão ativos.\n'
                'Os alunos perderão a conexão.'
            )
            dlg.add_button('Fechar sem parar', Gtk.ResponseType.NO)
            dlg.add_button('Parar tudo e fechar', Gtk.ResponseType.YES)
            resp = dlg.run()
            dlg.destroy()
            if resp == Gtk.ResponseType.YES:
                self._server_stop()
                self._hotspot_down()
        Gtk.main_quit()


def main():
    app = BloquinControl()
    Gtk.main()


if __name__ == '__main__':
    main()