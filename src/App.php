<?php

namespace OpenLab\TextToSpeech;

/**
 * Main plugin class.
 */
class App {
	/**
	 * Constructor.
	 *
	 * @access private
	 */
	private function __construct() {}

	/**
	 * Get singleton instance.
	 *
	 * @return App
	 */
	public static function get_instance() {
		static $instance = null;

		if ( null === $instance ) {
			$instance = new self();
		}

		return $instance;
	}

	/**
	 * Initialize plugin.
	 */
	public function init() {
		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
//		add_filter( 'the_content', array( $this, 'add_button' ) );
		add_filter( 'init', [ $this, 'register_shortcode' ] );
	}

	/**
	 * Enqueues assets.
	 */
	public function register_assets() {
		wp_register_script(
			'openlab-text-to-speech',
			plugins_url( 'build/frontend.js', __DIR__ ),
			[],
			filemtime( OPENLAB_TEXT_TO_SPEECH_PLUGIN_DIR . '/build/frontend.js' ),
			true
		);

		$script_data = [];

		if ( is_singular() ) {
			$post_content = apply_filters( 'the_content', get_queried_object()->post_content );
			$post_content = do_shortcode( $post_content );

			// Remove the 'openlab-text-to-speech-controls' element before sending the content to JS.
			$post_content = preg_replace( '/<form class="openlab-text-to-speech-controls hidden"[^>]*>.*?<\/form><!-- \/.openlab-text-to-speech-controls -->/s', '', $post_content );
			$post_content = wp_strip_all_tags( $post_content );

			$script_data['postContent'] = $post_content;
		}

		wp_add_inline_script(
			'openlab-text-to-speech',
			sprintf(
				'window.openLabTextToSpeech = %s;',
				wp_json_encode( $script_data )
			),
			'before'
		);

		wp_localize_script(
			'openlab-text-to-speech',
			'openLabTextToSpeechStrings',
			[
				'playAudio'   => __( 'Play audio', 'openlab-text-to-speech' ),
				'pauseAudio'  => __( 'Pause audio', 'openlab-text-to-speech' ),
				'resumeAudio' => __( 'Resume audio', 'openlab-text-to-speech' ),
				'stopAudio'   => __( 'Stop audio', 'openlab-text-to-speech' ),
			]
		);

		wp_register_style(
			'openlab-text-to-speech',
			plugins_url( 'build/frontend.css', __DIR__ ),
			[],
			filemtime( OPENLAB_TEXT_TO_SPEECH_PLUGIN_DIR . '/build/frontend.css' )
		);
	}

	/**
	 * Add button to content.
	 *
	 * @param string $content Post content.
	 * @return string
	 */
	public function add_button( $content ) {
		// Only add on single posts and in the main query
		if ( ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$button = sprintf(
			'<button id="play-audio" class="openlab-text-to-speech-button" aria-label="%s" aria-hidden="true">%s</button>',
			esc_attr__( 'Play audio of post content', 'openlab-text-to-speech' ),
			esc_html__( 'Play audio', 'openlab-text-to-speech' )
		);

		return $button . $content;
	}

	/**
	 * Register shortcode.
	 */
	public function register_shortcode() {
		add_shortcode( 'text_to_speech', [ $this, 'text_to_speech_shortcode' ] );
	}

	/**
	 * Shortcode callback.
	 *
	 * @param array $atts Shortcode attributes.
	 * @param string $content Shortcode content.
	 * @return string
	 */
	public function text_to_speech_shortcode( $atts, $content = '' ) {
		static $instance_id = 0;

		wp_enqueue_script( 'openlab-text-to-speech' );
		wp_enqueue_style( 'openlab-text-to-speech' );

		++$instance_id;

		$atts = shortcode_atts(
			[
				'button_text' => __( 'Play audio', 'openlab-text-to-speech' ),
			],
			$atts
		);

		$primary_controls = sprintf(
			'<div class="openlab-tts-primary-controls">
				<button class="openlab-tts-play">
					%s
				</button>

				<button class="openlab-tts-drawer-toggle" aria-controls="openlab-tts-drawer-%s">
					<span class="screen-reader-text">%s</span>
				</button>
			</div>',
			esc_html__( 'Listen', 'openlab-text-to-speech' ),
			esc_attr( $instance_id ),
			esc_html__( 'Settings', 'openlab-text-to-speech' )
		);

		$language_selector_inner = sprintf(
			'<label for="language-selector-%s">%s</label>
			<select class="language-selector" id="language-selector-%s">
				<option value="">%s</option>
			</select>',
			esc_attr( $instance_id ),
			esc_attr__( 'Language', 'openlab-text-to-speech' ),
			esc_attr( $instance_id ),
			esc_attr__( 'All languages', 'openlab-text-to-speech' )
		);

		$voice_selector_inner = sprintf(
			'<label for="voice-selector-%s" class="screen-reader-text">%s</label>
			<select class="voice-selector" id="voice-selector-%s">
				<option value="">%s</option>
			</select>',
			esc_attr( $instance_id ),
			esc_attr__( 'Voice', 'openlab-text-to-speech' ),
			esc_attr( $instance_id ),
			esc_attr__( 'All voices', 'openlab-text-to-speech' )
		);

		$rate_selector_inner = sprintf(
			'<span class="screen-reader-text" id="rate-selector-label">%s</span>

			<button class="rate-selector-incrementor rate-selector-incrementor-down" aria-controls="rate-selector-value-%s">
				<span class="screen-reader-text">%s</span>
			</button>

			<span id="rate-selector-value-%s" class="rate-selector-value" aria-labelledby="rate-selector-label" aria-live="polite" role="status">1.0X</span>

			<button class="rate-selector-incrementor rate-selector-incrementor-up" aria-controls="rate-selector-value-%s">
				<span class="screen-reader-text">%s</span>
			</button>

			<input type="hidden" id="rate-selector-%s" class="rate-selector" value="1.0">',
			esc_attr__( 'Rate', 'openlab-text-to-speech' ),
			esc_attr( $instance_id ),
			esc_attr__( 'Decrease rate', 'openlab-text-to-speech' ),
			esc_attr( $instance_id ),
			esc_attr( $instance_id ),
			esc_attr__( 'Increase rate', 'openlab-text-to-speech' ),
			esc_attr( $instance_id )
		);

		$el = sprintf(
			'<form class="openlab-text-to-speech-controls hidden">
				%s

				<div class="openlab-tts-drawer" id="openlab-tts-drawer-%s" aria-expanded="false">
					<div class="openlab-tts-drawer-inner">
						<div class="openlab-text-to-speech-control hidden">
							%s
						</div>

						<div class="openlab-text-to-speech-control">
							%s
						</div>

						<div class="openlab-text-to-speech-control openlab-text-to-speech-control-rate-selector">
							%s
						</div>

						<div class="openlab-text-to-speech-control openlab-text-to-speech-control-info-message">
							%s
						</div>
					</div>
				</div>
			</form><!-- /.openlab-text-to-speech-controls -->',
			$primary_controls,
			esc_attr( $instance_id ),
			$language_selector_inner,
			$voice_selector_inner,
			$rate_selector_inner,
			esc_html__( 'Available voices may vary based on your browser and device. Speech does not use AI.', 'openlab-text-to-speech' )
		);

		return $el;
	}
}
