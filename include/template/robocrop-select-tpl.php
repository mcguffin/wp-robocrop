<?php

if ( ! defined('ABSPATH') ) 
	die();

?>
	<script type="text/html" id="tmpl-robocrop-select">
		<div class="box">
			<h3>{{ data.model.get('title') }}</h3>
			<div class="details">
				<div class="dimensions">
					<strong>{{ data.l10n.ImageSize }}:</strong> {{ data.model.get('width') }} × {{ data.model.get('height') }}
				</div>
			</div>
		</div>
		<div class="choices"></div>
	</script>
