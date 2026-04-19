#!/usr/bin/env python3
"""
bloquin-control.py — Painel de controle do servidor Bloquin
Gerencia hotspot WiFi + servidor Node.js com um clique.

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
from pathlib import Path

# ── Configuração ──────────────────────────────────────────────────────────────

SERVER_DIR  = str(Path(__file__).resolve().parent)
SERVER_CMD  = ['/home/felipe/.nvm/versions/node/v24.14.0/bin/node', '--env-file=.env', 'server/index.js']
SERVER_PORT = 3000
HOTSPOT_IF  = 'wlp0s20f3'
HOTSPOT_IP  = '10.42.0.1'
REFRESH_MS  = 3000

# ── CSS (GTK3-safe: sem box-shadow, sem linear-gradient, sem transition) ──────

CSS = """
* {
    font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace;
}

window {
    background-color: #080b0f;
}

#root {
    background-color: #080b0f;
}

/* ── Header ── */
#header {
    background-color: #0d1520;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: #162030;
    padding: 14px 22px 12px 22px;
}

#logo-dot {
    background-color: #00e676;
    border-radius: 50px;
    min-width: 9px;
    min-height: 9px;
    margin-right: 10px;
}

#title {
    color: #e0ede0;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 4px;
}

#subtitle {
    color: #2a4258;
    font-size: 9px;
    letter-spacing: 2px;
}

#version-badge {
    background-color: #0a1420;
    border-width: 1px;
    border-style: solid;
    border-color: #162030;
    border-radius: 10px;
    padding: 2px 9px;
    color: #2a4258;
    font-size: 8px;
    letter-spacing: 1px;
}

/* ── Botão principal ── */
#btn-area {
    background-color: #080b0f;
    padding: 24px 22px 18px 22px;
}

#big-button {
    border-radius: 5px;
    border-style: solid;
    border-width: 1px;
    font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
    padding: 20px 0;
}

#big-button.on {
    background-color: #00c853;
    color: #000a04;
    border-color: #00c853;
}

#big-button.off {
    background-color: #0d1a26;
    color: #00e676;
    border-color: #1a2e40;
}

#big-button.stopping {
    background-color: #bf360c;
    color: #ffffff;
    border-color: #bf360c;
}

#big-button:hover {
    opacity: 0.85;
}

/* ── Status cards ── */
#status-section {
    padding: 0 22px 0 22px;
}

#section-eyebrow {
    color: #1a3048;
    font-size: 8px;
    letter-spacing: 3px;
    margin-bottom: 8px;
}

#status-card {
    background-color: #0d1520;
    border-width: 1px;
    border-style: solid;
    border-color: #162030;
    border-radius: 5px;
    padding: 11px 14px;
    margin-bottom: 5px;
}

#status-card-active {
    background-color: #061410;
    border-width: 1px;
    border-style: solid;
    border-color: #00e676;
    border-left-width: 3px;
    border-radius: 5px;
    padding: 11px 14px;
    margin-bottom: 5px;
}

#status-card-warn {
    background-color: #140d00;
    border-width: 1px;
    border-style: solid;
    border-color: #ff8f00;
    border-left-width: 3px;
    border-radius: 5px;
    padding: 11px 14px;
    margin-bottom: 5px;
}

#dot-off {
    background-color: #1a2e40;
    border-radius: 50px;
    min-width: 7px;
    min-height: 7px;
}

#dot-on {
    background-color: #00e676;
    border-radius: 50px;
    min-width: 7px;
    min-height: 7px;
}

#dot-warn {
    background-color: #ff8f00;
    border-radius: 50px;
    min-width: 7px;
    min-height: 7px;
}

#card-label {
    color: #5a7a90;
    font-size: 10px;
}

#card-status-off  { color: #2a4258; font-size: 9px; letter-spacing: 1.5px; }
#card-status-on   { color: #00e676; font-size: 9px; letter-spacing: 1.5px; }
#card-status-warn { color: #ff8f00; font-size: 9px; letter-spacing: 1.5px; }

/* ── URL box ── */
#url-section {
    padding: 10px 22px 0 22px;
}

#url-box {
    background-color: #060c14;
    border-width: 1px;
    border-style: solid;
    border-color: #162030;
    border-radius: 5px;
    padding: 11px 14px;
}

#url-box-active {
    background-color: #040c08;
    border-width: 1px;
    border-style: solid;
    border-color: #1a4030;
    border-left-width: 3px;
    border-left-color: #00e676;
    border-radius: 5px;
    padding: 11px 14px;
}

#url-eyebrow {
    color: #1a3048;
    font-size: 8px;
    letter-spacing: 2px;
    margin-bottom: 3px;
}

#url-value {
    color: #00e676;
    font-size: 14px;
    font-weight: 600;
}

#url-value-inactive {
    color: #1a3048;
    font-size: 14px;
    font-weight: 600;
}

#copy-btn {
    background-color: transparent;
    border-width: 1px;
    border-style: solid;
    border-color: #1a2e40;
    border-radius: 4px;
    color: #2a4258;
    font-size: 8px;
    letter-spacing: 1px;
    padding: 4px 9px;
    font-family: 'JetBrains Mono', monospace;
}

#copy-btn:hover {
    border-color: #00e676;
    color: #00e676;
}

/* ── Stats ── */
#stats-section {
    padding: 14px 22px 0 22px;
}

#stat-card {
    background-color: #0d1520;
    border-width: 1px;
    border-style: solid;
    border-color: #162030;
    border-radius: 5px;
    padding: 14px 8px;
}

#stat-value {
    font-size: 26px;
    font-weight: 700;
}

#stat-value.green { color: #00e676; }
#stat-value.amber { color: #ff8f00; }
#stat-value.blue  { color: #29b6f6; }
#stat-value.muted { color: #1a3048; }

#stat-sub {
    color: #1a3048;
    font-size: 7px;
    letter-spacing: 2px;
    margin-top: 1px;
}

/* ── Log ── */
#log-section {
    padding: 14px 22px 20px 22px;
}

#log-container {
    background-color: #050810;
    border-width: 1px;
    border-style: solid;
    border-color: #0d1520;
    border-radius: 5px;
}

#log-header {
    background-color: #080c14;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: #0d1520;
    border-radius: 5px 5px 0 0;
    padding: 6px 12px;
}

#log-dot {
    background-color: #0d1a26;
    border-radius: 50px;
    min-width: 6px;
    min-height: 6px;
    margin-right: 4px;
}

#log-header-label {
    color: #1a3048;
    font-size: 8px;
    letter-spacing: 2px;
}

textview {
    background-color: #050810;
    color: #2a4258;
    font-size: 9px;
}

textview text {
    background-color: #050810;
}

/* ── Scrollbar ── */
scrollbar {
    background-color: #050810;
}

scrollbar slider {
    background-color: #0d1a26;
    border-radius: 4px;
    min-width: 4px;
    min-height: 4px;
}

scrollbar slider:hover {
    background-color: #162030;
}
"""


class BloquinControl(Gtk.Window):

    def __init__(self):
        super().__init__(title="Bloquin Control")
        self.set_default_size(400, 640)
        self.set_resizable(True)
        self.set_position(Gtk.WindowPosition.CENTER)

        self.server_proc = None
        self.hotspot_on  = False
        self.server_on   = False
        self.starting    = False
        self.stopping    = False

        css_provider = Gtk.CssProvider()
        css_provider.load_from_data(CSS.encode("utf-8"))
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            css_provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self.connect('delete-event', self.on_close)
        self._build_ui()
        self._check_initial_state()
        GLib.timeout_add(REFRESH_MS, self._refresh_stats)

    # ── UI ────────────────────────────────────────────────────────────────────

    def _build_ui(self):
        outer_scroll = Gtk.ScrolledWindow()
        outer_scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.add(outer_scroll)

        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        root.set_name('root')
        outer_scroll.add(root)

        # ── Header ──────────────────────────────────────────────────────────
        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        header.set_name('header')

        logo_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        logo_dot = Gtk.Box()
        logo_dot.set_name('logo-dot')
        logo_dot.set_valign(Gtk.Align.CENTER)
        logo_row.pack_start(logo_dot, False, False, 0)

        title_col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_title = Gtk.Label(label='BLOQUIN')
        lbl_title.set_name('title')
        lbl_title.set_halign(Gtk.Align.START)
        lbl_sub = Gtk.Label(label='SERVIDOR DE AULA')
        lbl_sub.set_name('subtitle')
        lbl_sub.set_halign(Gtk.Align.START)
        title_col.pack_start(lbl_title, False, False, 0)
        title_col.pack_start(lbl_sub, False, False, 0)
        logo_row.pack_start(title_col, False, False, 0)

        version = Gtk.Label(label='v1.0')
        version.set_name('version-badge')
        version.set_valign(Gtk.Align.CENTER)

        header.pack_start(logo_row, True, True, 0)
        header.pack_end(version, False, False, 0)
        root.pack_start(header, False, False, 0)

        # ── Botão Principal ──────────────────────────────────────────────────
        btn_area = Gtk.Box()
        btn_area.set_name('btn-area')

        self.big_btn = Gtk.Button(label='▶  INICIAR AULA')
        self.big_btn.set_name('big-button')
        self.big_btn.get_style_context().add_class('off')
        self.big_btn.connect('clicked', self.on_big_button)
        self.big_btn.set_hexpand(True)
        btn_area.pack_start(self.big_btn, True, True, 0)
        root.pack_start(btn_area, False, False, 0)

        # ── Status Cards ─────────────────────────────────────────────────────
        status_section = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        status_section.set_name('status-section')

        eye1 = Gtk.Label(label='SERVIÇOS')
        eye1.set_name('section-eyebrow')
        eye1.set_halign(Gtk.Align.START)
        status_section.pack_start(eye1, False, False, 0)

        self.hotspot_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.hotspot_card.set_name('status-card')
        self.hotspot_dot = Gtk.Box()
        self.hotspot_dot.set_name('dot-off')
        self.hotspot_dot.set_valign(Gtk.Align.CENTER)
        lbl_hname = Gtk.Label(label='WiFi Hotspot  "Bloquin"')
        lbl_hname.set_name('card-label')
        lbl_hname.set_halign(Gtk.Align.START)
        self.hotspot_status_lbl = Gtk.Label(label='INATIVO')
        self.hotspot_status_lbl.set_name('card-status-off')
        self.hotspot_card.pack_start(self.hotspot_dot, False, False, 0)
        self.hotspot_card.pack_start(lbl_hname, True, True, 0)
        self.hotspot_card.pack_end(self.hotspot_status_lbl, False, False, 0)
        status_section.pack_start(self.hotspot_card, False, False, 0)

        self.server_card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.server_card.set_name('status-card')
        self.server_dot = Gtk.Box()
        self.server_dot.set_name('dot-off')
        self.server_dot.set_valign(Gtk.Align.CENTER)
        lbl_sname = Gtk.Label(label='Servidor Node.js')
        lbl_sname.set_name('card-label')
        lbl_sname.set_halign(Gtk.Align.START)
        self.server_status_lbl = Gtk.Label(label='INATIVO')
        self.server_status_lbl.set_name('card-status-off')
        self.server_card.pack_start(self.server_dot, False, False, 0)
        self.server_card.pack_start(lbl_sname, True, True, 0)
        self.server_card.pack_end(self.server_status_lbl, False, False, 0)
        status_section.pack_start(self.server_card, False, False, 0)

        root.pack_start(status_section, False, False, 0)

        # ── URL dos alunos ───────────────────────────────────────────────────
        url_section = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        url_section.set_name('url-section')

        self.url_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        self.url_box.set_name('url-box')

        url_col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        lbl_url_eye = Gtk.Label(label='ACESSO DOS ALUNOS')
        lbl_url_eye.set_name('url-eyebrow')
        lbl_url_eye.set_halign(Gtk.Align.START)
        self.url_value = Gtk.Label(label=f'http://{HOTSPOT_IP}:{SERVER_PORT}')
        self.url_value.set_name('url-value-inactive')
        self.url_value.set_halign(Gtk.Align.START)
        self.url_value.set_selectable(True)
        url_col.pack_start(lbl_url_eye, False, False, 0)
        url_col.pack_start(self.url_value, False, False, 0)

        self.copy_btn = Gtk.Button(label='COPIAR')
        self.copy_btn.set_name('copy-btn')
        self.copy_btn.set_valign(Gtk.Align.CENTER)
        self.copy_btn.connect('clicked', self._copy_url)

        self.url_box.pack_start(url_col, True, True, 0)
        self.url_box.pack_end(self.copy_btn, False, False, 0)
        url_section.pack_start(self.url_box, False, False, 0)
        root.pack_start(url_section, False, False, 0)

        # ── Stats ────────────────────────────────────────────────────────────
        stats_section = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        stats_section.set_name('stats-section')

        eye2 = Gtk.Label(label='SALA DE AULA')
        eye2.set_name('section-eyebrow')
        eye2.set_halign(Gtk.Align.START)
        stats_section.pack_start(eye2, False, False, 0)

        stats_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=7)
        self.stat_online    = self._make_stat('0',  'green', 'ONLINE')
        self.stat_compiling = self._make_stat('0',  'amber', 'COMPILANDO')
        self.stat_uptime    = self._make_stat('--', 'muted', 'UPTIME')
        stats_row.pack_start(self.stat_online[0],    True, True, 0)
        stats_row.pack_start(self.stat_compiling[0], True, True, 0)
        stats_row.pack_start(self.stat_uptime[0],    True, True, 0)
        stats_section.pack_start(stats_row, False, False, 0)
        root.pack_start(stats_section, False, False, 0)

        # ── Log ──────────────────────────────────────────────────────────────
        log_section = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        log_section.set_name('log-section')

        eye3 = Gtk.Label(label='LOG DO SERVIDOR')
        eye3.set_name('section-eyebrow')
        eye3.set_halign(Gtk.Align.START)
        log_section.pack_start(eye3, False, False, 0)

        log_container = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        log_container.set_name('log-container')

        log_hdr = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        log_hdr.set_name('log-header')
        for _ in range(3):
            d = Gtk.Box()
            d.set_name('log-dot')
            log_hdr.pack_start(d, False, False, 0)
        lbl_log = Gtk.Label(label='SAÍDA DO PROCESSO')
        lbl_log.set_name('log-header-label')
        lbl_log.set_margin_left(6)
        log_hdr.pack_start(lbl_log, False, False, 0)
        log_container.pack_start(log_hdr, False, False, 0)

        log_scroll = Gtk.ScrolledWindow()
        log_scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        log_scroll.set_min_content_height(150)

        self.log_buf  = Gtk.TextBuffer()
        self.log_view = Gtk.TextView(buffer=self.log_buf)
        self.log_view.set_editable(False)
        self.log_view.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
        self.log_view.set_cursor_visible(False)
        self.log_view.set_left_margin(10)
        self.log_view.set_right_margin(10)
        self.log_view.set_top_margin(6)
        self.log_view.set_bottom_margin(6)

        self.log_buf.create_tag('green', foreground='#00e676')
        self.log_buf.create_tag('amber', foreground='#ff8f00')
        self.log_buf.create_tag('red',   foreground='#f44336')
        self.log_buf.create_tag('blue',  foreground='#29b6f6')
        self.log_buf.create_tag('muted', foreground='#2a4258')
        self.log_buf.create_tag('ts',    foreground='#142030')

        log_scroll.add(self.log_view)
        log_container.pack_start(log_scroll, True, True, 0)
        log_section.pack_start(log_container, True, True, 0)
        root.pack_start(log_section, True, True, 0)

        self.show_all()

    def _make_stat(self, value, color_class, label):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=3)
        box.set_name('stat-card')

        val_lbl = Gtk.Label(label=value)
        val_lbl.set_name('stat-value')
        val_lbl.get_style_context().add_class(color_class)

        sub_lbl = Gtk.Label(label=label)
        sub_lbl.set_name('stat-sub')

        box.pack_start(val_lbl, False, False, 0)
        box.pack_start(sub_lbl, False, False, 0)
        return box, val_lbl

    # ── Lógica principal ──────────────────────────────────────────────────────

    def on_big_button(self, btn):
        if self.starting or self.stopping:
            return
        if not self.server_on and not self.hotspot_on:
            self._start_all()
        else:
            self._stop_all()

    def _start_all(self):
        self.starting = True
        self.big_btn.set_label('⌛  INICIANDO...')
        ctx = self.big_btn.get_style_context()
        ctx.add_class('stopping')
        ctx.remove_class('off')
        self._log('Iniciando hotspot WiFi...', 'muted')

        def worker():
            ok_h = self._hotspot_up()
            GLib.idle_add(self._update_hotspot_ui, ok_h)
            if ok_h:
                time.sleep(1)
                self._log('Hotspot ativo. Subindo servidor...', 'green')
            else:
                self._log('Hotspot falhou — continuando sem WiFi', 'amber')
            ok_s = self._server_start()
            GLib.idle_add(self._update_server_ui, ok_s)
            GLib.idle_add(self._finish_start, ok_h, ok_s)

        threading.Thread(target=worker, daemon=True).start()

    def _stop_all(self):
        self.stopping = True
        self.big_btn.set_label('⏹  ENCERRANDO...')
        ctx = self.big_btn.get_style_context()
        ctx.add_class('stopping')
        ctx.remove_class('on')
        self._log('Encerrando sessão...', 'amber')

        def worker():
            self._server_stop()
            GLib.idle_add(self._update_server_ui, False)
            time.sleep(0.5)
            self._hotspot_down()
            GLib.idle_add(self._update_hotspot_ui, False)
            GLib.idle_add(self._finish_stop)

        threading.Thread(target=worker, daemon=True).start()

    def _finish_start(self, ok_h, ok_s):
        self.starting = False
        ctx = self.big_btn.get_style_context()
        ctx.remove_class('stopping')
        if ok_s:
            self.big_btn.set_label('■  ENCERRAR AULA')
            ctx.add_class('on')
            ctx.remove_class('off')
            self._log(f'Tudo pronto! Alunos: http://{HOTSPOT_IP}:{SERVER_PORT}', 'green')
            self._set_url_active(True)
        else:
            self.big_btn.set_label('▶  INICIAR AULA')
            ctx.add_class('off')
            self._log('Falha ao iniciar. Verifique o log.', 'red')
            self._set_url_active(False)

    def _finish_stop(self):
        self.stopping = False
        ctx = self.big_btn.get_style_context()
        ctx.remove_class('on')
        ctx.remove_class('stopping')
        ctx.add_class('off')
        self.big_btn.set_label('▶  INICIAR AULA')
        self._reset_stats()
        self._set_url_active(False)
        self._log('Sessão encerrada com sucesso.', 'muted')

    # ── Hotspot ───────────────────────────────────────────────────────────────

    def _hotspot_up(self):
        r = subprocess.run(
            ['nmcli', 'connection', 'up', 'Hotspot'],
            capture_output=True, text=True
        )
        if r.returncode == 0:
            self.hotspot_on = True
            self._log('Hotspot reativado (Bloquin)', 'green')
            return True

        r2 = subprocess.run([
            'nmcli', 'device', 'wifi', 'hotspot',
            'ifname', HOTSPOT_IF,
            'ssid', 'Bloquin',
            'password', 'robotica123',
            'band', 'bg'
        ], capture_output=True, text=True)

        if r2.returncode == 0:
            self.hotspot_on = True
            self._log('Hotspot criado (Bloquin / robotica123)', 'green')
            return True

        self._log(f'Erro hotspot: {r2.stderr.strip()}', 'red')
        return False

    def _hotspot_down(self):
        subprocess.run(['nmcli', 'connection', 'down', 'Hotspot'], capture_output=True)
        self.hotspot_on = False
        self._log('Hotspot desligado', 'muted')

    # ── Servidor ──────────────────────────────────────────────────────────────

    def _server_start(self):
        try:
            env = os.environ.copy()
            self.server_proc = subprocess.Popen(
                SERVER_CMD,
                cwd=SERVER_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                preexec_fn=os.setsid
            )
            for _ in range(16):
                time.sleep(0.5)
                if self._server_alive():
                    self.server_on = True
                    self._log(f'Servidor ativo na porta {SERVER_PORT}', 'green')
                    threading.Thread(target=self._read_server_log, daemon=True).start()
                    return True
            self._log('Servidor não respondeu em 8s', 'red')
            return False
        except Exception as e:
            self._log(f'Erro ao iniciar: {e}', 'red')
            return False

    def _server_stop(self):
        if self.server_proc:
            try:
                os.killpg(os.getpgid(self.server_proc.pid), signal.SIGTERM)
                self.server_proc.wait(timeout=5)
            except Exception:
                try: self.server_proc.kill()
                except Exception: pass
            self.server_proc = None
        self.server_on = False
        self._log('Servidor encerrado', 'muted')

    def _server_alive(self):
        try:
            urllib.request.urlopen(f'http://localhost:{SERVER_PORT}/health', timeout=1)
            return True
        except Exception:
            return False

    def _read_server_log(self):
        if not self.server_proc:
            return
        for line in self.server_proc.stdout:
            line = line.strip()
            if line:
                color = 'muted'
                ll = line.lower()
                if 'erro' in ll or 'error' in ll:          color = 'red'
                elif 'compilando' in ll or 'fila' in ll:   color = 'amber'
                elif 'concluído' in ll or 'rodando' in ll: color = 'green'
                GLib.idle_add(self._log, f'srv › {line}', color)

    # ── Stats ─────────────────────────────────────────────────────────────────

    def _refresh_stats(self):
        if self.server_on:
            threading.Thread(target=self._fetch_stats, daemon=True).start()
        elif self.server_proc and self.server_proc.poll() is not None:
            self.server_on = False
            GLib.idle_add(self._update_server_ui, False)
            GLib.idle_add(self._log, 'Servidor encerrou inesperadamente!', 'red')
        return True

    def _fetch_stats(self):
        # FIX: indentação corrigida — try estava no nível da def (4 espaços), correto é 8
        try:
            req  = urllib.request.Request(
                f'http://localhost:{SERVER_PORT}/api/admin/local-stats'
            )
            data = json.loads(urllib.request.urlopen(req, timeout=2).read())

            online    = data.get('online', 0)
            compiling = data.get('compiling', 0)
            uptime    = int(data.get('uptime', 0))
            GLib.idle_add(self._update_stats_ui, online, compiling, uptime)

        except urllib.error.URLError:
            pass
        except Exception:
            pass

    def _update_stats_ui(self, online, compiling, uptime):
        self.stat_online[1].set_text(str(online))
        self.stat_compiling[1].set_text(str(compiling))
        h = uptime // 3600
        m = (uptime % 3600) // 60
        s = uptime % 60
        self.stat_uptime[1].set_text(f'{h}h{m:02d}' if h else f'{m}m{s:02d}s')

    def _reset_stats(self):
        self.stat_online[1].set_text('0')
        self.stat_compiling[1].set_text('0')
        self.stat_uptime[1].set_text('--')

    # ── UI helpers ────────────────────────────────────────────────────────────

    def _set_url_active(self, active):
        self.url_value.set_name('url-value' if active else 'url-value-inactive')
        self.url_box.set_name('url-box-active' if active else 'url-box')

    def _copy_url(self, btn):
        clipboard = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)
        clipboard.set_text(f'http://{HOTSPOT_IP}:{SERVER_PORT}', -1)
        self.copy_btn.set_label('✓ OK')
        GLib.timeout_add(1800, lambda: self.copy_btn.set_label('COPIAR') or False)

    def _update_hotspot_ui(self, on):
        self.hotspot_on = on
        if on:
            self.hotspot_dot.set_name('dot-on')
            self.hotspot_status_lbl.set_name('card-status-on')
            self.hotspot_status_lbl.set_text('ATIVO')
            self.hotspot_card.set_name('status-card-active')
        else:
            self.hotspot_dot.set_name('dot-off')
            self.hotspot_status_lbl.set_name('card-status-off')
            self.hotspot_status_lbl.set_text('INATIVO')
            self.hotspot_card.set_name('status-card')

    def _update_server_ui(self, on):
        self.server_on = on
        if on:
            self.server_dot.set_name('dot-on')
            self.server_status_lbl.set_name('card-status-on')
            self.server_status_lbl.set_text('RODANDO')
            self.server_card.set_name('status-card-active')
        else:
            self.server_dot.set_name('dot-off')
            self.server_status_lbl.set_name('card-status-off')
            self.server_status_lbl.set_text('INATIVO')
            self.server_card.set_name('status-card')

    def _log(self, msg, color='muted'):
        ts  = time.strftime('%H:%M:%S')
        end = self.log_buf.get_end_iter()
        self.log_buf.insert_with_tags_by_name(end, f'{ts}  ', 'ts')
        self.log_buf.insert_with_tags_by_name(end, f'{msg}\n', color)
        adj = self.log_view.get_vadjustment()
        GLib.idle_add(adj.set_value, adj.get_upper())

    def _check_initial_state(self):
        def check():
            r = subprocess.run(
                ['nmcli', '-t', '-f', 'NAME,STATE', 'connection', 'show', '--active'],
                capture_output=True, text=True
            )
            if 'Hotspot:activated' in r.stdout or 'Hotspot:activating' in r.stdout:
                GLib.idle_add(self._update_hotspot_ui, True)
                GLib.idle_add(self._log, 'Hotspot já está ativo', 'green')

            if self._server_alive():
                self.server_on = True
                GLib.idle_add(self._update_server_ui, True)
                GLib.idle_add(self._log, 'Servidor já está rodando', 'green')
                GLib.idle_add(self._finish_start, True, True)
            else:
                GLib.idle_add(self._log, 'Aguardando. Clique em INICIAR AULA.', 'muted')

        threading.Thread(target=check, daemon=True).start()

    def on_close(self, *_):
        if self.server_on or self.hotspot_on:
            dialog = Gtk.MessageDialog(
                transient_for=self,
                flags=0,
                message_type=Gtk.MessageType.QUESTION,
                buttons=Gtk.ButtonsType.NONE,
                text='Encerrar tudo ao fechar?'
            )
            dialog.format_secondary_text('O servidor e o hotspot ainda estão ativos.')
            dialog.add_button('Fechar sem parar', Gtk.ResponseType.NO)
            dialog.add_button('Parar tudo e fechar', Gtk.ResponseType.YES)
            response = dialog.run()
            dialog.destroy()
            if response == Gtk.ResponseType.YES:
                self._server_stop()
                self._hotspot_down()
        Gtk.main_quit()


def main():
    app = BloquinControl()
    Gtk.main()


if __name__ == '__main__':
    main()
