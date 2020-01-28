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
            fr.readAsText(file);
        });

        input.click();
        video.pause();
    };

    const srtParse = function(raw) {
        const vtt = [ 'WEBVTT', '' ];
        const entries = raw.replace(/(\r\n|\n\r)/g, '\n')
                           .trim()
                           .split(/\s*\n\n+\s*/);
        for ( const entry of entries ) {
            const lines = entry.split(/\s*\n\s*/);
            if ( /^\d+$/.test(lines[0]) === false ) { continue; }
            const times = /(\S+)\s+--+>\s+(\S+)/.exec(lines[1]);
            if ( times === null ) { continue; }
            vtt.push(
                lines[0],
                times[1].replace(/,/g, '.') + ' --> ' + times[2].replace(/,/g, '.'),
                lines.slice(2).join('\n'),
                ''
            );
        }
        return vtt.join('\n');
    };

    const srtInstall = function(video, vtt) {
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
        track.setAttribute('data-vtt-delta', '0');
        track.setAttribute('data-vtt', vtt);
        video.appendChild(track);
        track.track.mode = 'showing';
    };
})();
