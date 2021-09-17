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

'use strict';

{
    const browser = self.browser || self.chrome;

    const timeShiftContentScript = function() {
        let timeDelta = parseFloat('$0') || 0;
        const track = document.querySelector('video > track[label="CCaptioner"][data-vtt]');
        if ( track === null ) { return; }
        timeDelta += parseFloat(track.getAttribute('data-vtt-offset') || '0');
        track.setAttribute('data-vtt-offset', timeDelta);
        track.setAttribute('lineOffset',-1)
    };

    const timeSetContentScript = function() {
        let timeDelta = parseFloat('$0') || 0;
        const track = document.querySelector('video > track[label="CCaptioner"][data-vtt]');
        if ( track === null ) { return; }
        track.setAttribute('data-vtt-offset', timeDelta);
        track.setAttribute('lineOffset',-1)
    };
    
    const lineShiftContentScript = function() {
        let lineDelta = parseFloat('$0') || 0;
        const track = document.querySelector('video > track[label="CCaptioner"][data-vtt]');
        if ( track === null ) { return; }
        if (!track.hasAttribute('lineOffset')) {track.setAttribute('lineOffset',-1)} 
        lineDelta += parseFloat(track.getAttribute('lineOffset') || '0')
        track.setAttribute('lineOffset', lineDelta)

        for (const cue of track.track.cues) {
            cue.line = lineDelta
        }
    };
    

    const makeContentScript = function(fn, ...args) {
        let code = [ '(', fn.toString(), ')();', ].join('\n');
        for ( let i = 0; i < args.length; i++ ) {
            code = code.replace(`$${i}`, args[i]);
        }
        return code;
    };

    const injectScriptFile = function(name, callback) {
        browser.tabs.executeScript(
            { allFrames: true, file: `${name}.js` },
            callback
        );
    };

    const injectScriptCode = function(code) {
        browser.tabs.executeScript(
            { allFrames: true, code },
        );
    };

    const updateTimeOffset = function() {
        injectScriptFile('get-time-offset', results => {
            let val;
            for ( const result of results ) {
                if ( typeof result !== 'number' ) { continue; }
                val = result;
                break;
            }
            if ( val === undefined ) { return; }
            document.querySelector('#extraControls').style.display = 'block';
            let text = '0';
            if ( val > 0 ) { text = `+${val}`; }
            else if ( val < 0 ) { text = `${val}`.replace('-', '\u2212'); }
            document.querySelector('#shiftValue').textContent = text;
        });
    };

    updateTimeOffset();

    document.querySelector('#assignCaptions').addEventListener(
        'click',
        ( ) => {
            document.body.classList.add('assignCaptions');
            injectScriptFile('assign-captions');
            browser.tabs.insertCSS({
                allFrames: true,
                cssOrigin: 'user',
                file: 'user-captions.css',
            });
        },
        { once: true }
    );

    document.querySelector('#offsetCaptions').addEventListener(
        'click',
        ev => {
            const button = ev.target;
            if ( button.hasAttribute('data-offset') === false ) { return; }
            injectScriptCode(
                makeContentScript(
                    timeShiftContentScript,
                    button.getAttribute('data-offset')
                )
            );
            injectScriptFile('offset-captions', updateTimeOffset);
        }
    );

    document.querySelector('#lineCaptions').addEventListener(
        'click',
        ev => {
            const button = ev.target;
            if (button.hasAttribute('line-offset') === false) {return; }
            injectScriptCode(
                makeContentScript(
                    lineShiftContentScript,
                    button.getAttribute('line-offset')
                )
            );
            
        
        }
    );

    document.querySelector('#reset0Sec').addEventListener(
        'click',
        ( ) => {
            injectScriptCode(makeContentScript(timeSetContentScript, 0));
            injectScriptFile('offset-captions', updateTimeOffset);
        }
    );
}
