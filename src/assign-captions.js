/*******************************************************************************

    CCaptioner - a browser extension to block requests.
    Copyright (C) 2020-present Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/CCaptioner
*/

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track

'use strict';

(( ) => {
    if ( document.querySelector('video') === null ) { return; }
    if (
        self.closedCaptioner instanceof Object &&
        self.closedCaptioner.closedCaptioner === true
    ) {
        return;
    }
    self.closedCaptioner = { closedCaptioner: true };

    let clientX = 0;
    let clientY = 0;

    const handleMouseEvent = function(ev) {
        clientX = ev.clientX;
        clientY = ev.clientY;
        findVideoUnderMouse();
    };
    const listenerOptions = {
        passive: true,
    };

    document.addEventListener('click', handleMouseEvent, listenerOptions);
    document.addEventListener('mousedown', handleMouseEvent, listenerOptions);
    document.addEventListener('mousemove', handleMouseEvent, listenerOptions);

    let timer = setTimeout(
        ( ) => {
            timer = undefined;
            stop();
        },
        10000
    );

    const stop = function() {
        document.removeEventListener('click', handleMouseEvent, listenerOptions);
        document.removeEventListener('mousedown', handleMouseEvent, listenerOptions);
        document.removeEventListener('mousemove', handleMouseEvent, listenerOptions);
        if ( timer !== undefined ) {
            clearTimeout(timer);
            timer = undefined;
        }
        self.closedCaptioner = undefined;
    };

    const findVideoUnderMouse = function() {
        const elems = document.elementsFromPoint(clientX, clientY);
        for ( const elem of elems ) {
            if ( elem.localName !== 'video' ) { continue; }
            stop();
            srtPick(elem);
        }
    };

    const srtPick = function(video) {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', '.srt,.vtt');
        input.style.display = 'none';

        input.addEventListener('change', ev => {
            const button = ev.target;
            const file = button.files[0];
            if ( file === undefined || file.name === '' ) { return; }
            if (
                file.type.indexOf('text') !== 0 &&
                file.type.indexOf('subrip') === -1
            ) {
                return;
            }
            const fr = new FileReader();
            fr.onload = ( ) => {
                srtInstall(video, srtParse(fr.result));
            };
            fr.readAsArrayBuffer(file);
        });

        input.click();
        video.pause();
    };

    // <https://www.w3.org/TR/webvtt1/>, excerpts:
    //
    // - Timecode hours are optional
    //
    // - The frame numbering/identification preceding the timecode is
    //   optional
    //
    // - Comments are just blocks that are preceded by a blank line, start
    //   with the word "NOTE" (followed by a space or newline), and end
    //   at the first blank line.

    const tcodeParse = function(timecode) {
        const fields = /(\d+:)?(\d+:\d+)([\.,])(\d+)/.exec(timecode);
        if ( fields === null ) { return ''; }
        if ( typeof fields[1] !== 'string' ) {
            fields[1] = '00:';
        }
        fields[3] = '.';
        return fields.slice(1).join('');
    };

    // https://github.com/gorhill/ccaptioner/issues/3
    //   For now support some of the most common encodings, as per:
    //   https://w3techs.com/technologies/history_overview/character_encoding
    const textDecode = function(buffer) {
        const encodings = [
            'utf-8',
            'iso-8859-1',
            'Windows-1251',
            'shift-jis',
            'gbk',
            'euc-kr',
            'iso-8859-9',
            'iso-8859-2',
        ];
        for ( const encoding of encodings ) {
            try {
                const decoder = new TextDecoder(encoding, { fatal: true });
                return decoder.decode(buffer);
            } catch (ex) {
            }
        }
        return '';
    };

    const srtParse = function(buffer) {
        const raw = textDecode(buffer);
        if ( raw === '' ) { return ''; }
        const vtt = [ 'WEBVTT', '' ];
        const entries = raw.replace(/(\r\n|\n\r)/g, '\n')
                           .trim()
                           .split(/\s*\n\n+\s*/);
        for ( const entry of entries ) {
            let i = 0;
            const lines = entry.split(/\s*\n\s*/);
            if ( /^\d+$/.test(lines[i+0]) ) { i += 1; }
            const times = /^(\S+)\s+--+>\s+(\S+)/.exec(lines[i+0]);
            if ( times === null ) { continue; }
            const t0 = tcodeParse(times[1]);
            const t1 = tcodeParse(times[2]);
            if ( t0 === '' || t1 === '' ) { continue; }
            vtt.push(
                `${t0} --> ${t1}`,
                ...lines.slice(i+1),
                ''
            );
        }
        return vtt.join('\n');
    };

    const srtInstall = function(video, vtt) {
        if ( vtt === '' ) { return; }
        for ( const elem of video.querySelectorAll('track') ) {
            elem.remove();
        }
        const blob = new Blob([ vtt ], { type: 'text/vtt' });
        const blobURL = URL.createObjectURL(blob);
        const track = document.createElement('track');
        track.setAttribute('default', '');
        track.setAttribute('kind', 'subtitles');
        track.setAttribute('label', 'CCaptioner');
        track.setAttribute('srclang', 'zz');
        track.setAttribute('src', blobURL);
        track.setAttribute('data-vtt-offset', '0');
        track.setAttribute('data-vtt', vtt);
        video.appendChild(track);
        track.track.mode = 'showing';
    };
})();
