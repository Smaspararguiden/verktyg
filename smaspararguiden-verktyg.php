<?php
/**
 * Plugin Name: Småspararguidens verktyg
 * Description: Räknesnurror från Småspararguiden. ITP1-räknesnurran visas med kortkoden [itp_raknesnurra].
 * Version: 0.1.2
 * Author: Småspararguiden
 * Requires PHP: 7.4
 */

// The tools run entirely in the visitor's browser. The plugin only serves
// their files from this site and puts a tool where its shortcode is placed.

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
    return '<div class="sg-itp"><noscript>Räknesnurran behöver JavaScript.</noscript></div>'
        . '<script type="module" src="' . esc_url($bas . 'visning.js?ver=' . $ver) . '"></script>';
}
add_shortcode('itp_raknesnurra', 'sgv_itp_raknesnurra');
