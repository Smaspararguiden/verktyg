<?php
/**
 * Plugin Name: Småspararguidens verktyg
 * Description: Räknesnurror från Småspararguiden. ITP1-räknesnurran visas med kortkoden [itp_raknesnurra].
 * Version: 0.1.4
 * Author: Småspararguiden
 * Requires PHP: 7.4
 */

// The tools run entirely in the visitor's browser. The plugin serves their
// files from this site, puts a tool where its shortcode is placed and passes the
// calculator's statistics on to Google from the server.

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Version string for a tool's files: the newest modification time among its
 * scripts and styles. Overwriting a file gives every file new URLs, so no
 * browser mixes a new upload with cached old files.
 */
function sgv_version(string $mapp): string
{
    $filer = array_merge(
        glob(__DIR__ . "/$mapp/*.js") ?: [],
        glob(__DIR__ . "/$mapp/*.css") ?: []
    );
    return (string) max(array_map('filemtime', $filer) ?: [0]);
}

/**
 * [itp_raknesnurra]: an empty element that visning.js fills with the form,
 * the result and "Så har vi räknat".
 */
function sgv_itp_raknesnurra(): string
{
    $ver = sgv_version('itp');
    $bas = plugins_url('itp/', __FILE__);
    // Enqueued from the shortcode, so WordPress prints it in the footer and
    // only on pages that use the tool.
    wp_enqueue_style('sgv-itp', $bas . 'stil.css', [], $ver);
    // The address the page reports to; the preview page has none and sends nothing.
    $insamling = rest_url('sgv/v1/itp-resultat');
    return '<div class="sg-itp" data-insamling="' . esc_url($insamling) . '">'
        . '<noscript>Räknesnurran behöver JavaScript.</noscript></div>'
        . '<script type="module" src="' . esc_url($bas . 'visning.js?ver=' . $ver) . '"></script>';
}
add_shortcode('itp_raknesnurra', 'sgv_itp_raknesnurra');

// The Apps Script that keeps the calculator's statistics in a Google sheet, see
// apps-script/itp-resultat.gs. Not a secret.
const SGV_ITP_INSAMLING = 'https://script.google.com/macros/s/AKfycbwTc68eThpPp1CJRe8imSGomzMnPSdIPq428ZxiTSBLidKz_il-deyUxKOVVKgTvbaz/exec';

/**
 * Passes one report from the calculator on to the Apps Script, so that Google
 * sees this server instead of the visitor. Nothing is stored here, and the
 * visitor's address is not passed on. Open to anyone, like the page itself, so
 * only small JSON objects go through; the script checks every value.
 */
function sgv_itp_resultat(WP_REST_Request $anrop): WP_REST_Response
{
    $text = $anrop->get_body();
    if (strlen($text) > 3000 || !is_array(json_decode($text, true))) {
        return new WP_REST_Response(null, 400);
    }
    // The script saves the row before it answers with a redirect, which is
    // not followed. A failure is not reported: the visitor never waits for it.
    wp_remote_post(SGV_ITP_INSAMLING, [
        'body' => $text,
        'headers' => ['Content-Type' => 'text/plain'],
        'timeout' => 10,
        'redirection' => 0,
    ]);
    return new WP_REST_Response(null, 204);
}
add_action('rest_api_init', function (): void {
    register_rest_route('sgv/v1', '/itp-resultat', [
        'methods' => 'POST',
        'callback' => 'sgv_itp_resultat',
        'permission_callback' => '__return_true',
    ]);
});
