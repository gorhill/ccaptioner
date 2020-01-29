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

    Home: https://github.com/gorhill/ccaptioner
*/

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track

'use strict';

// Offset text track as per `data-vtt-offset` attribute

(( ) => {
    const oldTrack = document.querySelector('video > track[label="CCaptioner"][data-vtt]');
    if ( oldTrack === null ) { return; }

    const timeDelta = parseInt(oldTrack.getAttribute('data-vtt-offset') || '0', 10);

    let vtt = oldTrack.getAttribute('data-vtt');
    if ( typeof vtt !== 'string' || vtt === '' ) { return; }

    const timeShift = function(timecode) {
        const fields = /(\d+):(\d+):(\d+).(\d+)/.exec(timecode);
        let seconds = parseInt(fields[1], 10) * 3600 +
                      parseInt(fields[2], 10) *   60 +
                      parseInt(fields[3], 10) *    1 +
                      timeDelta;
        if ( seconds < 0 ) { return '00:00:00.000'; }
        const hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
        seconds %= 3600;
        const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
        seconds %= 60;
        const ss = seconds.toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}.${fields[4]}`;
    };

    const entries = vtt.trim().split(/\n\n/);

    for ( let i = 0; i < entries.length; i++ ) {
        const lines = entries[i].split(/\n/);
        const times = /(\S+) --> (\S+)/.exec(lines[0]);
        if ( times === null ) { continue; }
        const t0 = timeShift(times[1]);
        if ( t0 === '' ) { return; }
        const t1 = timeShift(times[2]);
        lines[0] = `${t0} --> ${t1}`;
        entries[i] = lines.join('\n');
    }
    vtt = entries.join('\n\n');

    const blob = new Blob([ vtt ], { type: 'text/vtt' });
    const blobURL = URL.createObjectURL(blob);
    const newTrack = oldTrack.cloneNode(false);
    newTrack.setAttribute('data-vtt-offset', timeDelta);
    newTrack.setAttribute('src', blobURL);
    oldTrack.replaceWith(newTrack);
    newTrack.track.mode = 'showing';
})();
