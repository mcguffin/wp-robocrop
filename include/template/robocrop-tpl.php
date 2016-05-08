<?php

if ( ! defined('ABSPATH') ) 
	die();

?>
	<script type="text/html" id="tmpl-robocrop">
		<div class="robocrop-sidebar">
			<div class="select-ratio"></div>
			<div class="box actions">
				<button class="button robocrop-autocrop-current"><?php _e('Crop by Focus Point','wp-robocrop'); ?></button>
				<button class="button robocrop-autocrop-all"><?php _e('Crop All by Focus Point','wp-robocrop'); ?></button>
			</div>
		</div>

		<div class="robocrop-content">
		</div>
	</script>
