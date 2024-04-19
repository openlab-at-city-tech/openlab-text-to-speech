/* global navigator, openLabTextToSpeech, openLabTextToSpeechStrings */
import EasySpeech from 'easy-speech'
const languages = new Set()
let voices

// Detect the user's language and set as the default value.
const userLang = navigator.language || navigator.userLanguage

document.body.onload = () => {
	let isPlaying = false
	let hasStarted = false

	EasySpeech.init( { maxTimout: 5000, interval: 250 } )
		.then( () => {
			const playAudioEls = document.querySelectorAll( '.openlab-text-to-speech' )
			if ( ! playAudioEls.length ) {
				return
			}

			initVoices()

			playAudioEls.forEach( el => initButton( el ) )

			// For debug purposes, we append the detected features to the body
			const detectedFeatures = EasySpeech.detect()
			const detectedFeaturesEl = document.createElement( 'div' )
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
			Array.from( languages ).forEach( lang => {
				const option = document.createElement( 'option' )
				option.value = lang
				option.text = lang

				if ( lang === userLang ) {
					option.selected = true
				}

				languageSelector.add( option )
			} )
		}

		populateVoices( languageSelector )

		languageSelector.addEventListener( 'change', event => populateVoices( event.target ) )
	}

	const onButtonClick = event => {
		const clickedButton = event.target

		const voice = getSelectedVoice( clickedButton )

		if ( isPlaying ) {
			EasySpeech.pause()
			clickedButton.innerHTML = openLabTextToSpeechStrings.playAudio
			isPlaying = false
		} else {
			if ( ! hasStarted ) {
				EasySpeech.speak( {
					text: openLabTextToSpeech.postContent,
					voice,
				} )
			} else {
				EasySpeech.resume()
			}

			clickedButton.innerHTML = openLabTextToSpeechStrings.pauseAudio
			isPlaying = true
			hasStarted = true
		}
	}
}

const initVoices = () => {
	// Get a list of languages.
	voices = EasySpeech.voices()

	voices.forEach( voice => {
		languages.add( voice.lang )
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
