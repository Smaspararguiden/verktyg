<?php
/**
 * Plugin Name: Småspararguidens verktyg
 * Description: Räknesnurror från Småspararguiden. ITP1-räknesnurran visas med kortkoden [itp_raknesnurra].
 * Version: 0.1.15
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

/**
 * [itp_mejl_till_facket]: an empty box that visning.js, loaded by
 * [itp_raknesnurra] on the same page, fills with a mail to the union holding
 * the visitor's figures. The site places it among its own blocks. On a page
 * without the calculator it stays empty.
 *
 * The site can write the mail itself:
 * [itp_mejl_till_facket amne="..."]text with {kostnad} and {per_manad}[/itp_mejl_till_facket].
 * The text goes to the page as it is, in a <template> that the browser does
 * not show, and visning.js turns WordPress's paragraphs back into plain text.
 * Without a subject or text, the calculator's own is used.
 *
 * Two more attributes hold the help texts in the box: hjalp, under the
 * buttons once the mail is shown, and rakna_forst, shown instead of the mail
 * before the visitor has calculated. Without hjalp there is no text there;
 * without rakna_forst the calculator's own is used.
 *
 * @param array|string $atts    Shortcode attributes; '' when there are none.
 * @param string|null  $content The text between the tags, if any.
 */
function sgv_itp_mejl_till_facket($atts = [], ?string $content = null): string
{
    $atts = shortcode_atts(
        ['amne' => '', 'hjalp' => '', 'rakna_forst' => ''],
        $atts,
        'itp_mejl_till_facket'
    );
    $mall = trim((string) $content) === ''
        ? ''
        : '<template class="mall">' . $content . '</template>';
    return '<div class="sg-itp-facket" data-amne="' . esc_attr($atts['amne'])
        . '" data-hjalp="' . esc_attr($atts['hjalp'])
        . '" data-rakna-forst="' . esc_attr($atts['rakna_forst']) . '">'
        . $mall . '</div>';
}
add_shortcode('itp_mejl_till_facket', 'sgv_itp_mejl_till_facket');

/**
 * [itp_text namn="..."]text[/itp_text]: a text the site writes itself for a
 * place in the calculator, such as osaker_itp1, kapital or hitta_kapital. The text goes to
 * the page in a <template> the browser does not show; visning.js puts it in
 * the calculator in place of its own. It can stand anywhere on the page.
 *
 * @param array|string $atts    Shortcode attributes; '' when there are none.
 * @param string|null  $content The text between the tags, if any.
 */
function sgv_itp_text($atts = [], ?string $content = null): string
{
    $atts = shortcode_atts(['namn' => ''], $atts, 'itp_text');
    $namn = sanitize_key($atts['namn']);
    if ($namn === '' || trim((string) $content) === '') {
        return '';
    }
    return '<template class="sgv-text" data-namn="' . esc_attr($namn) . '">'
        . $content . '</template>';
}
add_shortcode('itp_text', 'sgv_itp_text');

// The Apps Script that keeps the calculator's statistics in a Google sheet, see
// apps-script/itp-resultat.gs. Not a secret.
const SGV_ITP_INSAMLING = 'https://script.google.com/macros/s/AKfycbwTc68eThpPp1CJRe8imSGomzMnPSdIPq428ZxiTSBLidKz_il-deyUxKOVVKgTvbaz/exec';

/**
 * The address reports are forwarded to. When the site has a key in the
 * sgv_itp_nyckel option, it is added as a query parameter; the script checks
 * it against its SGV_NYCKEL property when one is set there.
 */
function sgv_insamlings_url(): string
{
    $nyckel = (string) get_option('sgv_itp_nyckel', '');
    return $nyckel === ''
        ? SGV_ITP_INSAMLING
        : SGV_ITP_INSAMLING . '?nyckel=' . rawurlencode($nyckel);
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
        'timeout' => 3,
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

// Settings -> Småspararguiden: the key for the statistics receiver, a link to
// the sheet, counters for the reports passing through and a test button.
// Built only with WordPress' own admin controls. Only configuration and
// counts are stored in the database, never report contents.
add_action('admin_init', function (): void {
    if (get_option('sgv_itp_nyckel') === false) {
        add_option('sgv_itp_nyckel', wp_generate_password(32, false));
    }
    register_setting('sgv_verktyg', 'sgv_itp_ark', [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => '',
    ]);
    if (!current_user_can('manage_options')) {
        return;
    }
    if (isset($_POST['sgv_ny_nyckel']) && check_admin_referer('sgv_ny_nyckel')) {
        update_option('sgv_itp_nyckel', wp_generate_password(32, false));
        wp_safe_redirect(add_query_arg(['nyckel' => 'ny'], admin_url('options-general.php?page=sgv-verktyg')));
        exit;
    }
    if (isset($_POST['sgv_provrapport']) && check_admin_referer('sgv_provrapport')) {
        // A row marked test, sent through the same endpoint the page uses.
        wp_remote_post(rest_url('sgv/v1/itp-resultat'), [
            'body' => (string) json_encode([
                'kalla' => 'test',
                'lage' => 'ingen',
                'resultat' => 'nej',
                'kod' => bin2hex(random_bytes(16)),
            ]),
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 5,
            'redirection' => 0,
        ]);
        wp_safe_redirect(add_query_arg(['prov' => 'skickad'], admin_url('options-general.php?page=sgv-verktyg')));
        exit;
    }
});

add_action('admin_menu', function (): void {
    add_options_page('Småspararguidens verktyg', 'Småspararguiden', 'manage_options', 'sgv-verktyg', 'sgv_admin_sida');
});

function sgv_admin_sida(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    $nyckel = (string) get_option('sgv_itp_nyckel', '');
    $ark = (string) get_option('sgv_itp_ark', '');
    $stat = get_option('sgv_matning_stat', []);
    echo '<div class="wrap">';
    echo '<h1>Småspararguidens verktyg</h1>';
    if (isset($_GET['nyckel'])) {
        echo '<div class="notice notice-success"><p>Ny nyckel skapad. Sätt samma värde i egenskapen <code>SGV_NYCKEL</code> i Apps Script.</p></div>';
    }
    if (isset($_GET['prov'])) {
        echo '<div class="notice notice-info"><p>Provrad skickad genom endpointen, märkt <code>test</code> i arket.</p></div>';
    }
    echo '<h2>Statistik från ITP-räknesnurran</h2>';
    echo '<p>Rapporter skickas vidare till Apps Script och sparas i dess Google-ark. I WordPress sparas bara räknare, aldrig rapporterna.</p>';
    echo '<table class="widefat striped"><thead><tr><th>Anrop till statistik-endpointen</th><th>Antal</th></tr></thead><tbody>';
    echo '<tr><td>Skickade vidare</td><td>' . (int) ($stat['skickade'] ?? 0) . '</td></tr>';
    echo '<tr><td>Misslyckade vidarebefordringar</td><td>' . (int) ($stat['misslyckade'] ?? 0) . '</td></tr>';
    echo '<tr><td>Begränsade (429)</td><td>' . (int) ($stat['begransade'] ?? 0) . '</td></tr>';
    echo '</tbody></table>';
    echo '<h2>Kalkylark</h2>';
    echo '<form method="post" action="options.php">';
    settings_fields('sgv_verktyg');
    echo '<table class="form-table" role="presentation"><tr>';
    echo '<th scope="row"><label for="sgv_itp_ark">Länk till Google-arket</label></th>';
    echo '<td><input type="url" name="sgv_itp_ark" id="sgv_itp_ark" class="regular-text" value="' . esc_attr($ark) . '"></td>';
    echo '</tr></table>';
    submit_button();
    echo '</form>';
    if ($ark !== '') {
        echo '<p><a class="button" href="' . esc_url($ark) . '" target="_blank" rel="noopener">Öppna kalkylarket</a></p>';
    }
    echo '<h2>Nyckel till statistikmottagaren</h2>';
    echo '<p>Skickas med varje rapport som <code>?nyckel=</code>. Sätt samma värde i egenskapen <code>SGV_NYCKEL</code> i Apps Script; tills dess accepteras alla anrop där.</p>';
    echo '<form method="post" action="">';
    wp_nonce_field('sgv_ny_nyckel');
    echo '<input type="text" class="regular-text" readonly value="' . esc_attr($nyckel) . '" onclick="this.select()"> ';
    submit_button('Skapa ny nyckel', 'secondary', 'sgv_ny_nyckel');
    echo '</form>';
    echo '<h2>Prova kedjan</h2>';
    echo '<p>Skickar en rad märkt <code>test</code> från sajten genom endpointen till arket.</p>';
    echo '<form method="post" action="">';
    wp_nonce_field('sgv_provrapport');
    submit_button('Skicka provrad', 'secondary', 'sgv_provrapport');
    echo '</form>';
    echo '</div>';
}
