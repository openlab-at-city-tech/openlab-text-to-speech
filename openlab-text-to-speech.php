<?php
/*
Plugin Name: OpenLab Text to Speech
Plugin URI: https://openlab.citytech.cuny.edu
Description: Adds a text to speech button to posts and pages
Version: 1.0
Author: OpenLab at City Tech
Author URI: https://openlab.citytech.cuny.edu
License: GPLv2 or later
*/

require __DIR__ . '/vendor/autoload.php';

/**
 * Loads plugin.
 */
function openlab_text_to_speech() {
	OpenLab\TextToSpeech\App::get_instance()->init();
}
add_action( 'plugins_loaded', 'openlab_text_to_speech' );
