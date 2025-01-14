/* NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org */
/* (c) 2023 KudoAI & contributors under the MIT license */
/* Source: https://github.com/chatgptjs/chatgpt.js */

(async () => {

    document.documentElement.setAttribute('cwm-extension-installed', true) // for userscript auto-disable

    // Import libs
    var { config, settings } = await import(chrome.runtime.getURL('lib/settings-utils.js'))
    var { chatgpt } = await import(chrome.runtime.getURL('lib/chatgpt.js'))

    // Add msg listener
    chrome.runtime.onMessage.addListener(function(request) {
        if (request.type === 'notify') chatgpt.notify(request.msg, request.position)
        else window[request.type]()
        return true
    })

    await chatgpt.isLoaded()

    // Collect OpenAI classes
    var sendButtonClasses = (document.querySelector('form button[class*="bottom"]') || {}).classList || []
    var sendSVGclasses = (document.querySelector('form button[class*="bottom"] svg') || {}).classList || []
    var inputTextAreaClasses = (document.querySelector("form button[class*='bottom']") || {}).previousSibling.classList || []
    var sidepadClasses = (document.querySelector('#__next > div > div') || {}).classList || []
    var sidebarClasses = (document.querySelector('#__next > div > div.dark') || {}).classList || []
    var mainDivClasses = (document.querySelector('#__next > div > div.flex') || {}).classList || []

    // Create/stylize tooltip div
    var tooltipDiv = document.createElement('div')
    tooltipDiv.classList.add('toggle-tooltip')
    var tooltipStyle = document.createElement('style')
    tooltipStyle.innerHTML = `.toggle-tooltip {
        /* Box style */   background: black ; padding: 5px ; border-radius: 6px ;
        /* Font style */  font-size: 0.7rem ; color: white ;
        /* V-position */  position: absolute ; top: -22px ;
        /* Visibility */  opacity: 0 ; transition: opacity 0.1s ; z-index: 9999 }`
    document.head.appendChild(tooltipStyle)

    // General style tweaks
    var tweaksStyle = document.createElement('style')
    tweaksStyle.innerHTML = (
           classListToCSS(inputTextAreaClasses) + ' { padding-right: 128px } ' // make input text area accomdate buttons
        + 'div.group > div > div:first-child > div:nth-child(2) { ' // move response paginator
            + 'position: relative ; left: 54px ; top: 7px } ' // ...below avatar to avoid cropping
        + 'form > div > div:nth-child(2), form textarea { max-height: 68vh !important; } ' ) // expand text input vertically
    document.head.appendChild(tweaksStyle)

    // Create wide screen style
    var wideScreenStyle = document.createElement('style')
    wideScreenStyle.id = 'wideScreen-mode' // for toggleMode()
    wideScreenStyle.innerHTML = '.text-base { max-width: 93% !important } '
        + 'div' + classListToCSS(mainDivClasses) + '{ width: 100px }' // prevent sidebar shrinking when zoomed

    // Create full-window style
    var fullWindowStyle = document.createElement('style')
    fullWindowStyle.id = 'fullWindow-mode' // for toggleMode()
    fullWindowStyle.innerHTML = classListToCSS(sidebarClasses) + '{ display: none }' // hide sidebar
        + classListToCSS(sidepadClasses) + '{ padding-left: 0px }' // remove side padding

    // Create full-window button & add icon/classes/position/listeners
    var fullWindowButton = document.createElement('div') // create button
    fullWindowButton.id = 'fullWindow-button' // for toggleTooltip()
    fullWindowButton.type = 'button'
    updateSVG('fullWindow') // insert icon
    fullWindowButton.setAttribute('class', sendButtonClasses) // assign borrowed classes
    fullWindowButton.style.cssText = 'right: 2.57rem' // position left of wide screen button
    fullWindowButton.style.cursor = 'pointer' // Add finger cursor // 添加鼠标手势为手指
    fullWindowButton.addEventListener('click', () => { toggleMode('fullWindow') })
    fullWindowButton.addEventListener('mouseover', toggleTooltip)
    fullWindowButton.addEventListener('mouseout', toggleTooltip)

    // Create wide screen button & add icon/classes/position/icon/listeners
    var wideScreenButton = document.createElement('div') // create button
    wideScreenButton.id = 'wideScreen-button' // for toggleTooltip()
    wideScreenButton.type = 'button'
    updateSVG('wideScreen') // insert icon
    wideScreenButton.setAttribute('class', sendButtonClasses) // assign borrowed classes
    wideScreenButton.style.cssText = 'right: 4.34rem' // position left of Send buttonx
    wideScreenButton.style.cursor = 'pointer' // Add finger cursor // 添加鼠标手势为手指
    wideScreenButton.addEventListener('click', () => { toggleMode('wideScreen') })
    wideScreenButton.addEventListener('mouseover', toggleTooltip)
    wideScreenButton.addEventListener('mouseout', toggleTooltip)

    // Create new chat button & add icon/classes/position/icon/listeners
    var newChatButton = document.createElement('div') // create button
    newChatButton.id = 'newChat-button' // for toggleTooltip()
    updateSVG('newChat') // insert icon
    newChatButton.setAttribute('class', sendButtonClasses) // assign borrowed classes
    newChatButton.style.cssText = 'right: 6.11rem' // position left of full-window button
    newChatButton.style.cursor = 'pointer' // Add finger cursor // 添加鼠标手势为手指
    newChatButton.addEventListener('click', () => { chatgpt.startNewChat() })
    newChatButton.addEventListener('mouseover', toggleTooltip)
    newChatButton.addEventListener('mouseout', toggleTooltip)

    // Insert buttons
    settings.load('extensionDisabled').then(function() {
        if (!config.extensionDisabled) insertChatButtons() // eslint-disable-line no-undef
    })

    // Monitor node changes to update button visibility + auto-toggle once + manage send button's tooltip
    var prevSessionChecked = false
    var navObserver = new MutationObserver(([{ addedNodes, type }]) => {
        if (type === 'childList' && addedNodes.length) {

            // Restore previous session's state + manage toggles
            settings.load(['wideScreen', 'fullWindow', 'fullerWindow', 'extensionDisabled']).then(function() {
                if (!config.extensionDisabled) {                    
                    if (!prevSessionChecked) { // restore previous session's state
                        if (config.wideScreen) toggleMode('wideScreen', 'ON')
                        if (config.fullWindow) toggleMode('fullWindow', 'ON')
                        prevSessionChecked = true
                    }
                    insertChatButtons() // eslint-disable-line no-undef
                }
                prevSessionChecked = true // even if extensionDisabled, to avoid double-toggle
            })

            // Manage send button's tooltip
            var sendButton = document.querySelector('form button[class*="bottom"]')
            if (sendButton) { // add/remove tooltip based on enabled state
                if (!sendButton.hasAttribute('disabled') && !sendButton.hasAttribute('hasTooltip')) {
                    sendButton.addEventListener('mouseover', toggleTooltip)
                    sendButton.addEventListener('mouseout', toggleTooltip)
                    sendButton.setAttribute('hasTooltip', true)
                } else if (sendButton.hasAttribute('disabled') && sendButton.hasAttribute('hasTooltip')) {
                    tooltipDiv.style.opacity = '0' // hide tooltip in case cursor was hovering
                    sendButton.removeEventListener('mouseover', toggleTooltip)
                    sendButton.removeEventListener('mouseout', toggleTooltip)
                    sendButton.removeAttribute('hasTooltip')
                }
            }
        }
    }) ; navObserver.observe(document.documentElement, { childList: true, subtree: true })

    // Monitor scheme changes to update button colors
    var schemeObserver = new MutationObserver(([{ type, target }]) => {
        if (target === document.documentElement && type === 'attributes' && target.getAttribute('class'))
            settings.load(['extensionDisabled']).then(function() {
                if (!config.extensionDisabled) {
                    updateSVG('wideScreen') ; updateSVG('fullWindow') ; updateSVG('newChat')
    }})}) ; schemeObserver.observe(document.documentElement, { attributes: true })

    // Declare script functions

    function classListToCSS(classList) { // convert DOM classList to single CSS selector
        return '.' + [...classList].join('.') // prepend dot to dot-separated string
            .replaceAll(/([:\[\]])/g, '\\$1') // escape CSS special chars
    }

    function toggleMode(mode, state = '') {
        var modeStyle = document.getElementById(mode + '-mode') // look for existing mode style
        if (state.toUpperCase() == 'ON' || !modeStyle) { // if missing or ON-state passed
            modeStyle = mode == 'wideScreen' ? wideScreenStyle : fullWindowStyle
            if (mode == 'fullWindow' && config.fullerWindow) // activate fuller window if enabled for full window
                if (!config.wideScreen) document.head.appendChild(wideScreenStyle) ; updateSVG('wideScreen', 'on')
            document.head.appendChild(modeStyle); state = 'on' // activate mode
        } else { // de-activate mode
            if (mode == 'fullWindow' && !config.wideScreen) // if exiting full-window, also disable widescreen if not manually enabled
                try { document.head.removeChild(wideScreenStyle) } catch (error) {} updateSVG('wideScreen', 'off')
            document.head.removeChild(modeStyle) ; state = 'off' // de-activate mode
        }
        settings.save(mode, state.toUpperCase() === 'ON' ? true : false)
        updateSVG(mode) ; updateTooltip(mode) // update icon/tooltip
        settings.load('notifHidden').then(function() {
            if (!config.notifHidden) { // show mode notification if enabled
                chatgpt.notify(chrome.i18n.getMessage('mode_' + mode) + ' ' + state.toUpperCase(),
                    '', '', chatgpt.isDarkMode() ? '' : 'shadow' )
        }})
    }

    function toggleTooltip(event) {
        var buttonType = (
            event.target.id.includes('wide') ? 'wideScreen' :
            event.target.id.includes('full') ? 'fullWindow' :
            event.target.id.includes('new') ? 'newChat' : 'sendMsg')
        updateTooltip(buttonType) // since mouseover's can indicate button change
        tooltipDiv.style.opacity = event.type === 'mouseover' ? '0.8' : '0' // toggle visibility
    }

    function updateSVG(mode, state = '') {

        // Define SVG viewbox + paths
        var buttonColor = chatgpt.isDarkMode() || chatgpt.history.isOff() ? 'white' : '#202123'
        var svgViewBox = ( mode == 'newChat' ? '11 6 ' : '8 8 ' ) // move to XY coords to crop whitespace
            + ( mode == 'newChat' ? '13 13' : '20 20' ) // shrink to 20x20 to match Send button size
        var wideScreenONpaths = `
            <path fill="${ buttonColor }" fill-rule="evenodd"
                d="m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z"></path>`
        var wideScreenOFFpaths = `
            <path fill="${ buttonColor }" fill-rule="evenodd"
                d="m 28,11 0,14 -20,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z"></path>`
        var fullWindowONpaths = `
            <path fill="${ buttonColor }" d="m 14,14 -4,0 0,2 6,0 0,-6 -2,0 0,4 0,0 z"></path>
            <path fill="${ buttonColor }" d="m 22,14 0,-4 -2,0 0,6 6,0 0,-2 -4,0 0,0 z"></path>
            <path fill="${ buttonColor }" d="m 20,26 2,0 0,-4 4,0 0,-2 -6,0 0,6 0,0 z"></path>
            <path fill="${ buttonColor }" d="m 10,22 4,0 0,4 2,0 0,-6 -6,0 0,2 0,0 z"></path>`
        var fullWindowOFFpaths = `
            <path fill="${ buttonColor }" d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z"></path>
            <path fill="${ buttonColor }" d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z"></path>
            <path fill="${ buttonColor }" d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z"></path>
            <path fill="${ buttonColor }" d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z"></path>`
        var newChatPaths = `<path fill="${ buttonColor }"d="M22,13h-4v4h-2v-4h-4v-2h4V7h2v4h4V13z"></path>`

        // Pick appropriate button/paths
        var [button, ONpaths, OFFpaths] = (
            mode == 'wideScreen' ? [wideScreenButton, wideScreenONpaths, wideScreenOFFpaths]
          : mode == 'fullWindow' ? [fullWindowButton, fullWindowONpaths, fullWindowOFFpaths]
                                 : [newChatButton, newChatPaths, newChatPaths])

        // Initialize rem margin offset vs. OpenAI's .mr-1 for hover overlay centeredness
        var lMargin = mode == 'wideScreen' ? .11 : .12
        var rMargin = (.25 - lMargin)

        // Update SVG
        button.innerHTML = '<svg '
            + `class="${ sendSVGclasses }" ` // assign borrowed classes
            + `style="margin: 0 ${ rMargin }rem 0 ${ lMargin }rem ; ` // center overlay
            + 'pointer-events: none" ' // prevent triggering tooltips twice
            + `viewBox="${ svgViewBox }"> ` // set pre-tweaked viewbox
            + (config[mode] || state.toLowerCase() == 'on' ? ONpaths : OFFpaths + '</svg>') // dynamically insert paths based on loaded key
    }

    function updateTooltip(buttonType) { // text & position
        tooltipDiv.innerHTML = chrome.i18n.getMessage('tooltip_' + buttonType + (
            !/full|wide/i.test(buttonType) ? '' : (config[buttonType] ? 'OFF' : 'ON')))
        var ctrAddend = 17, overlayWidth = 30
        var iniRoffset = overlayWidth * (
            buttonType.includes('send') ? 0
                : buttonType.includes('Window') ? 1
                : buttonType.includes('Screen') ? 2 : 3) + ctrAddend
        tooltipDiv.style.right = `${ // horizontal position
            iniRoffset - tooltipDiv.getBoundingClientRect().width / 2}px`
    }

    // Define script functions as expressions for listeners

    insertChatButtons = function() { // eslint-disable-line no-undef
        var chatbar = document.querySelector("form button[class*='bottom']").parentNode
        if (chatbar.contains(fullWindowButton)) {
            return // if buttons aren't missing, exit
        } else { chatbar.append(newChatButton, fullWindowButton, wideScreenButton, tooltipDiv) }
    }

    removeChatButtons = function() { // eslint-disable-line no-undef
        var chatbar = document.querySelector('form button[class*="bottom"]').parentNode
        if (!chatbar.contains(fullWindowButton)) { return // if buttons are missing, exit
        } else { // remove chat toggles
            var nodesToRemove = [newChatButton, fullWindowButton, wideScreenButton, tooltipDiv];
            for (var i = 0 ; i < nodesToRemove.length ; i++) { chatbar.removeChild(nodesToRemove[i]) }
    }}

    toggleExtension = function() { // eslint-disable-line no-undef
        settings.load('extensionDisabled', 'wideScreen', 'fullWindow', 'fullerWindow', 'notifHidden', 'wideScreenStyle').then(function() {

            if (config.extensionDisabled) { // try to disable modes
                try { document.head.removeChild(wideScreenStyle) } catch {}
                try { document.head.removeChild(fullWindowStyle) } catch {}
                removeChatButtons() // eslint-disable-line no-undef

            } else { // extension is enabled, so update mode states

                // Toggle full-window if necessary
                if (config.fullWindow && !document.getElementById('fullWindow-mode')) {
                    document.head.appendChild(fullWindowStyle) ; updateSVG('fullWindow', 'on')
                    if (config.fullerWindow && !document.getElementById('wideScreen-mode'))
                        document.head.appendChild(wideScreenStyle) ; updateSVG('wideScreen', 'on')
                    if (!config.notifHidden)
                        chatgpt.notify(chrome.i18n.getMessage('mode_fullWindow') + ' ON', 'lower-right')
                } else if (!config.fullWindow && document.getElementById('fullWindow-mode')) {
                    document.head.removeChild(fullWindowStyle) ; updateSVG('fullWindow', 'off')
                    if (!config.wideScreen) // also remove widescreen since not manually enabled
                        try { document.head.removeChild(wideScreenStyle) ; updateSVG('wideScreen', 'off') } catch (error) {}
                    if (!config.notifHidden)
                        chatgpt.notify(chrome.i18n.getMessage('mode_fullWindow') + ' OFF', 'lower-right')
                }

                // Toggle widescreen if necessary
                if (config.wideScreen && !document.getElementById('wideScreen-mode')) {
                    document.head.appendChild(wideScreenStyle) ; updateSVG('wideScreen', 'on')
                    if (!config.notifHidden) {
                        chatgpt.notify(chrome.i18n.getMessage('mode_wideScreen') + ' ON', 'lower-right') }
                } else if (!config.wideScreen && !config.fullWindow && document.getElementById('wideScreen-mode')) {
                    document.head.removeChild(wideScreenStyle) ; updateSVG('wideScreen', 'off')
                    if (!config.notifHidden)
                        chatgpt.notify(chrome.i18n.getMessage('mode_wideScreen') + ' OFF', 'lower-right')
                }

                insertChatButtons() // eslint-disable-line no-undef
            }
    })}

})()
