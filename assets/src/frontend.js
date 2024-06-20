/* global navigator, openLabTextToSpeech, openLabTextToSpeechStrings */

import EasySpeech from 'easy-speech'
import languages from '@cospired/i18n-iso-languages'
import countries from 'i18n-iso-countries'

const browserLanguages = new Set()
let voices

// Detect the user's language and set as the default value.
const userLang = navigator.language || navigator.userLanguage

document.body.onload = () => {
	let isPlaying = false
	let hasStarted = false

	const playAudioEls = document.querySelectorAll( '.openlab-text-to-speech' )
	if ( ! playAudioEls.length ) {
		return
	}

	const esFlags = {
		maxTimout: 5000,
		interval: 250,
	}

	EasySpeech.init( esFlags )
		.then( () => {
			initVoices()

			playAudioEls.forEach( el => initButton( el ) )

			// For debug purposes, we append the detected features to the body
			const detectedFeatures = EasySpeech.detect()
			const detectedFeaturesEl = document.createElement( 'div' )

			// Additional debug info.
			detectedFeatures.userLang = userLang

			const languageNames = []
			Array.from( browserLanguages ).forEach( lang => {
				languageNames.push( lang )
			} )

			detectedFeatures.languages = languageNames

			detectedFeaturesEl.classList.add( 'openlab-text-to-speech__detected-features' )
			detectedFeaturesEl.innerHTML = `<pre>${ JSON.stringify( detectedFeatures, null, 2 ) }</pre>`
			playAudioEls.forEach( el => el.appendChild( detectedFeaturesEl ) )
		} )
		.catch( error => {
			console.error( error )
		} )

	const initButton = el => {
		const { buttonText } = el.dataset

		const playAudioButton = document.createElement( 'button' )
		playAudioButton.classList.add( 'openlab-text-to-speech__button' )
		playAudioButton.ariaLabel = buttonText
		playAudioButton.innerHTML = buttonText
		playAudioButton.ariaHidden = true

		playAudioButton.addEventListener( 'click', onButtonClick )

		el.appendChild( playAudioButton )

		const languageSelector = el.querySelector( '.language-selector' )
		if ( languageSelector ) {
			const defaultLanguage = getDefaultLanguage()

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
		const clickedButton = event.target

		const voice = getSelectedVoice( clickedButton )

		if ( isPlaying ) {
			if ( browserSupports( 'charIndex' ) ) {
				EasySpeech.pause()
			} else {
				EasySpeech.cancel()
			}

			const newButtonText = browserSupports( 'charIndex' ) ? openLabTextToSpeechStrings.resumeAudio : openLabTextToSpeechStrings.playAudio

			clickedButton.innerHTML = newButtonText
		} else {
			if ( ! hasStarted ) {
				EasySpeech.speak( {
					text: openLabTextToSpeech.postContent,
					voice,
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
				} )
			} else if ( browserSupports( 'charIndex' ) ) {
				EasySpeech.pause()
			} else {
				EasySpeech.cancel()
			}

			const newButtonText = browserSupports( 'charIndex' ) ? openLabTextToSpeechStrings.pauseAudio : openLabTextToSpeechStrings.stopAudio

			clickedButton.innerHTML = newButtonText
		}
	}

	const initVoices = () => {
		// Get a list of languages.
		voices = EasySpeech.voices()

		voices.forEach( voice => {
			browserLanguages.add( voice.lang )
		} )
	}

	const populateVoices = languageSelector => {
		const selectedLang = languageSelector.value

		const voicesList = voices.filter( voice => voice.lang === selectedLang )

		const voiceSelector = languageSelector.closest( '.openlab-text-to-speech' ).querySelector( '.voice-selector' )
		voiceSelector.innerHTML = ''

		voicesList.forEach( voice => {
			const option = document.createElement( 'option' )
			option.value = voice.name
			option.text = voice.name

			voiceSelector.add( option )
		} )
	}

	const getSelectedVoice = button => {
		const languageSelector = button.closest( '.openlab-text-to-speech' ).querySelector( '.language-selector' )
		const voiceSelector = button.closest( '.openlab-text-to-speech' ).querySelector( '.voice-selector' )

		const selectedLang = languageSelector.value
		const selectedVoice = voiceSelector.value

		return voices.find( voice => voice.lang === selectedLang && voice.name === selectedVoice )
	}

	const browserSupports = ( feature ) => {
		switch ( feature ) {
			case 'charIndex':
				// @todo Identify specific browsers that support charIndex.
				return false

			default:
				return false
		}
	}

	const debug = ( message ) => {
		// Delete existing debug info.
		document.querySelectorAll( '.openlab-text-to-speech__detected-features' ).forEach( el => el.remove() )


	}
}
