/* global navigator, openLabTextToSpeech, openLabTextToSpeechStrings */

import EasySpeech from 'easy-speech'
import languages from '@cospired/i18n-iso-languages'
import countries from 'i18n-iso-countries'

import './frontend.scss'

const browserLanguages = new Set()
let voices

// Detect the user's language and set as the default value.
const userLang = navigator.language || navigator.userLanguage

document.body.onload = () => {
	let isPlaying = false
	let hasStarted = false

	const playAudioEls = document.querySelectorAll( '.openlab-text-to-speech-controls' )
	if ( ! playAudioEls.length ) {
		return
	}

	const detectedFeaturesEl = document.createElement( 'div' )
	detectedFeaturesEl.classList.add( 'openlab-text-to-speech__detected-features' )
	playAudioEls.forEach( el => el.appendChild( detectedFeaturesEl ) )

	const esFlags = {
		maxTimout: 5000,
		interval: 250,
	}

	EasySpeech.init( esFlags )
		.then( () => {
			initVoices()

			playAudioEls.forEach( el => {
				initButton( el )
				el.classList.remove( 'hidden' )
			} )

			// For debug purposes, we append the detected features to the body
			const detectedFeatures = EasySpeech.detect()

			// Additional debug info.
			detectedFeatures.userLang = userLang

			const languageNames = []
			Array.from( browserLanguages ).forEach( lang => {
				languageNames.push( lang )
			} )

			detectedFeatures.languages = languageNames

//			detectedFeaturesEl.innerHTML = `<pre>${ JSON.stringify( detectedFeatures, null, 2 ) }</pre>`
		} )
		.catch( error => {
			console.error( error )
		} )

	const initButton = el => {
		const { buttonText } = el.dataset

		const defaultLanguage = getDefaultLanguage()

		// No English found. Hide the controls.
		if ( ! defaultLanguage ) {
			return
		}

		const playAudioButton = document.createElement( 'button' )
		playAudioButton.classList.add( 'openlab-text-to-speech__button' )
		playAudioButton.ariaLabel = buttonText
		playAudioButton.innerHTML = buttonText
		playAudioButton.ariaHidden = true

		playAudioButton.addEventListener( 'click', onButtonClick )

		// Put inside of a div.openlab-text-to-speech-control element.
		const control = document.createElement( 'div' )
		control.classList.add( 'openlab-text-to-speech-control' )
		control.appendChild( playAudioButton )

		el.querySelector( '.openlab-text-to-speech-controls-container' ).appendChild( playAudioButton )

		const languageSelector = el.querySelector( '.language-selector' )

		if ( languageSelector ) {

			Array.from( browserLanguages ).forEach( lang => {
				const option = document.createElement( 'option' )
				option.value = lang
				option.text = lang

				if ( lang === defaultLanguage ) {
					option.selected = true
				}

				languageSelector.add( option )
			} )
		}

		populateVoices( languageSelector )

		languageSelector.addEventListener( 'change', event => populateVoices( event.target ) )
	}

	const getDefaultLanguage = () => {
		// For the time being, we will use heuristics to identify English.
		// If no English is found, we will return null.

		const englishLanguages = new Set( [ 'en-US', 'en', 'eng-USA-default' ] )

		// See whether browserLanguages has any of the English languages.
		const englishLanguage = Array.from( browserLanguages ).find( lang => englishLanguages.has( lang ) )

		if ( englishLanguage ) {
			return englishLanguage
		}

		return null

		// What follows is the original code that attempted to detect the user's language.

		// Format 'en'.
		// Firefox on Arch
		if ( browserLanguages.has( userLang ) ) {
			return userLang
		}

		const userLangParts = userLang.split( '-' )
		const userLangCode = userLangParts[0]
		const userCountryCode = userLangParts[1]

		// Format 'en_US'.
		// Chrome on Android
		const userLangCodeAlpha2 = `${ userLangCode }_${ userCountryCode }`
		if ( browserLanguages.has( userLangCodeAlpha2 ) ) {
			return userLangCodeAlpha2
		}

		// Format 'eng-USA-default'
		// Firefox on Android
		const userLangAlpha3 = languages.alpha2ToAlpha3T( userLangCode )
		const userCountryAlpha3 = countries.alpha2ToAlpha3( userCountryCode )

		const userLangCodeAlpha3 = `${ userLangAlpha3 }-${ userCountryAlpha3 }`

		// See if any of the browser languages starts with userLangCodeAlpha3.
		const userLangCodeAlpha3Start = Array.from( browserLanguages ).find( lang => lang.startsWith( userLangCodeAlpha3 ) )
		if ( userLangCodeAlpha3Start ) {
			return userLangCodeAlpha3Start
		}
	}

	const onButtonClick = ( event ) => {
		event.preventDefault()

		const clickedButton = event.target

		const voice = getSelectedVoice( clickedButton )

		const speakArgs = {
			text: openLabTextToSpeech.postContent,
			voice,
			rate: getSelectedRate( clickedButton ),
			end: () => {
				hasStarted = false
				isPlaying = false
			},
			pause: () => {
				isPlaying = false
			},
			resume: () => {
				isPlaying = true
			},
			start: () => {
				hasStarted = true
				isPlaying = true
			},
		}
		console.log( speakArgs.rate )

		if ( isPlaying ) {
			if ( browserSupports( 'charIndex' ) ) {
				EasySpeech.pause()
			} else {
				EasySpeech.cancel()
			}

			const newButtonText = browserSupports( 'charIndex' ) ? openLabTextToSpeechStrings.resumeAudio : openLabTextToSpeechStrings.playAudio

			isPlaying = false
			clickedButton.innerHTML = newButtonText
		} else {
			if ( ! hasStarted ) {
				EasySpeech.speak( speakArgs )
			} else if ( browserSupports( 'charIndex' ) ) {
				EasySpeech.resume()
			} else {
				EasySpeech.speak( speakArgs )
			}

			hasStarted = true

			const newButtonText = browserSupports( 'charIndex' ) ? openLabTextToSpeechStrings.pauseAudio : openLabTextToSpeechStrings.stopAudio

			clickedButton.innerHTML = newButtonText
		}
	}

	const initVoices = () => {
		// Get a list of languages.
		voices = EasySpeech.voices()

		voices.forEach( voice => {
			if ( voiceIsSupported( voice ) ) {
				browserLanguages.add( voice.lang )
			}
		} )
	}

	const getPlatform = () => {
		const platform  = navigator.platform.toLowerCase();
		if ( platform.includes('win') ) {
			return 'Windows';
		} else if ( platform.includes( 'mac' ) ) {
			return 'macOS';
		} else if ( platform.includes( 'linux' ) ) {
			return 'Linux';
		} else if ( platform.includes( 'iphone' ) || platform.includes( 'ipad' ) ) {
			return 'iOS';
		}

		const userAgent = navigator.userAgent.toLowerCase();
		if ( userAgent.includes( 'android' ) ) {
			return 'Android';
		}

		return 'Unknown';
	}

	const voiceIsSupported = voice => {
		return true
	}

	const populateVoices = languageSelector => {
		const selectedLang = languageSelector.value

		const excludedVoices = [
			'English (America)+Andy',
			'Albert',
			'Bad News',
			'Bahh',
			'Bells',
			'Boing',
			'Bubbles',
			'Cellos',
			'Good News',
			'Jester',
			'Organ',
			'Trinoids',
			'Whisper',
			'Wobble',
			'Zarvox',
			'Google US English',
		]

		const voicesList = voices.filter( voice => {
			if ( excludedVoices.includes( voice.name ) ) {
				return false
			}

			return voice.lang === selectedLang
		} )

		const voiceSelector = languageSelector.closest( '.openlab-text-to-speech-controls' ).querySelector( '.voice-selector' )
		voiceSelector.innerHTML = ''

		voicesList.forEach( voice => {
			const option = document.createElement( 'option' )
			option.value = voice.name
			option.text = voice.name

			voiceSelector.add( option )
		} )
	}

	const getSelectedVoice = button => {
		const languageSelector = button.closest( '.openlab-text-to-speech-controls' ).querySelector( '.language-selector' )
		const voiceSelector = button.closest( '.openlab-text-to-speech-controls' ).querySelector( '.voice-selector' )

		const selectedLang = languageSelector.value
		const selectedVoice = voiceSelector.value

		return voices.find( voice => voice.lang === selectedLang && voice.name === selectedVoice )
	}

	const getSelectedRate = button => {
		const rateSelector = button.closest( '.openlab-text-to-speech-controls' ).querySelector( '.rate-selector' )

		return parseFloat( rateSelector.value )
	}

	const browserSupports = ( feature ) => {
		switch ( feature ) {
			case 'charIndex':
				// iOS
				if ( navigator.platform === 'iPhone' || navigator.platform === 'iPad' || navigator.platform === 'iPod' ) {
					return true
				}
				return false

			default:
				return false
		}
	}

	const debug = ( message ) => {
		const detectectedFeaturesEls = document.querySelectorAll( '.openlab-text-to-speech__detected-features' )

		// create an array from the NodeList
		const detectectedFeaturesArray = Array.from( detectectedFeaturesEls )

		detectectedFeaturesArray.forEach( el => {
			// remove all children
			el.innerHTML = ''
			el.innerHTML = `<p>${ message }</p>`
		} )
	}
}
