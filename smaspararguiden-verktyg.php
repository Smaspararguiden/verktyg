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
 * Version string for a tool's files: a hash of the newest modification time
 * among its scripts and styles. Overwriting a file gives every file new URLs,
 * so no browser mixes a new upload with cached old files, and the raw
 * timestamp is not exposed in the URLs.
 */
function sgv_version(string $mapp): string
{
    $filer = array_merge(
        glob(__DIR__ . "/$mapp/*.js") ?: [],
        glob(__DIR__ . "/$mapp/*.css") ?: []
    );
    return substr(hash('sha256', (string) max(array_map('filemtime', $filer) ?: [0])), 0, 16);
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
 * The address reports are forwarded to.
 */
function sgv_insamlings_url(): string
{
    return SGV_ITP_INSAMLING;
}

/**
 * The visitor's address as the proxy in front reports it: the last
 * X-Forwarded-For entry when the direct peer is the local proxy, since a
 * client can prepend forged entries. Without a proxy header this is the
 * proxy's own address, and the per-address limit below becomes a global one.
 */
function sgv_klient_ip(): string
{
    $peer = $_SERVER['REMOTE_ADDR'] ?? '';
    if (in_array($peer, ['127.0.0.1', '::1'], true)) {
        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($xff !== '') {
            $delar = explode(',', $xff);
            return trim(end($delar));
        }
    }
    return $peer;
}

// Reports per minute: per address, and in total as a backstop.
const SGV_MATNING_GRANS = 10;
const SGV_MATNING_TOTALT = 120;

/**
 * Whether this request is over the limit. Counted before anything is
 * forwarded, so a flood cannot hold PHP workers with the upstream call.
 */
function sgv_for_manga(): bool
{
    $granser = [SGV_MATNING_GRANS, SGV_MATNING_TOTALT];
    $nycklar = ['sgv_matning_' . md5(sgv_klient_ip()), 'sgv_matning_allt'];
    foreach ($nycklar as $i => $nyckel) {
        $antal = (int) get_transient($nyckel);
        if ($antal >= $granser[$i]) {
            return true;
        }
        set_transient($nyckel, $antal + 1, MINUTE_IN_SECONDS);
    }
    return false;
}

/**
 * Passes one report from the calculator on to the Apps Script, so that Google
 * sees this server instead of the visitor. Nothing is stored here, and the
 * visitor's address is not passed on. Open to anyone, like the page itself, so
 * it is rate limited and only small JSON objects go through; the script checks
 * every value. Only counts of requests are kept, in the sgv_matning_stat option.
 */
function sgv_itp_resultat(WP_REST_Request $anrop): WP_REST_Response
{
    $stat = get_option('sgv_matning_stat', ['skickade' => 0, 'misslyckade' => 0, 'begransade' => 0]);
    if (sgv_for_manga()) {
        $stat['begransade']++;
        update_option('sgv_matning_stat', $stat);
        return new WP_REST_Response(null, 429);
    }
    $text = $anrop->get_body();
    $tolkad = json_decode($text, true);
    if (strlen($text) > 3000 || !is_array($tolkad) || count($tolkad) > 30) {
        return new WP_REST_Response(null, 400);
    }
    foreach (array_keys($tolkad) as $nyckel) {
        if (!is_string($nyckel)) {
            return new WP_REST_Response(null, 400);
        }
    }
    // The script saves the row before it answers with a redirect, which is
    // not followed. A failure is not reported: the visitor never waits for it.
    $svar = wp_remote_post(sgv_insamlings_url(), [
        'body' => $text,
        'headers' => ['Content-Type' => 'text/plain'],
        'timeout' => 5,
        'redirection' => 0,
    ]);
    if (is_wp_error($svar) || wp_remote_retrieve_response_code($svar) >= 400) {
        $stat['misslyckade']++;
    } else {
        $stat['skickade']++;
    }
    update_option('sgv_matning_stat', $stat);
    return new WP_REST_Response(null, 204);
}
add_action('rest_api_init', function (): void {
    register_rest_route('sgv/v1', '/itp-resultat', [
        'methods' => 'POST',
        'callback' => 'sgv_itp_resultat',
        'permission_callback' => '__return_true',
    ]);
});
