<?php

if ( ! defined('ABSPATH') ) 
	die();

?>
	<script type="text/html" id="tmpl-robocrop-select">
		<div class="box">
			<h3>{{ data.model.get('title') }}</h3>
			<div class="details">
				<div class="dimensions">
					<strong><?php esc_html_e( 'Image size', 'wp-robocrop' ) ?>:</strong> {{ data.model.get('width') }} × {{ data.model.get('height') }}
				</div>
			</div>
		</div>
		<div class="choices"></div>
	</script>
