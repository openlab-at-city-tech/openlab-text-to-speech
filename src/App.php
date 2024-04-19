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
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
//		add_filter( 'the_content', array( $this, 'add_button' ) );
		add_filter( 'init', [ $this, 'register_shortcode' ] );
	}

	/**
	 * Enqueue scripts.
	 */
	public function enqueue_scripts() {
		wp_enqueue_script(
			'openlab-text-to-speech',
			plugins_url( 'build/frontend.js', __DIR__ ),
			[],
			filemtime( __DIR__ . '/build/frontend.js' ),
			true
		);

		$script_data = [];

		if ( is_singular() ) {
			$post_content = apply_filters( 'the_content', get_queried_object()->post_content );
			$post_content = do_shortcode( $post_content );
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
			]
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
		$atts = shortcode_atts(
			[
				'button_text' => __( 'Play audio', 'openlab-text-to-speech' ),
			],
			$atts
		);

		$el = sprintf(
			'<div class="openlab-text-to-speech" data-button-text="%s">
				<div>
					<select class="language-selector">
						<option value="">All languages</option>
					</select>
				</div>

				<div>
					<select class="voice-selector">
						<option value="">Select a voice</option>
					</select>
				</div>
			</div>',
			esc_attr( $atts['button_text'] )
		);

		return $el;
	}
}
