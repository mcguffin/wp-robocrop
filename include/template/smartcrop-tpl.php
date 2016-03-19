<?php



?>
	<script type="text/html" id="tmpl-smartcrop">
		<div class="smartcrop-sidebar">
			<div class="select-ratio"></div>
			<div class="box actions">
				<button class="button smartcrop-cancel"><?php _e('Cancel','wp-smartcrop'); ?></button>
				<# if ( data.focuspoint ) { #>
				<button class="button smartcrop-autocrop"><?php _e('Auto crop','wp-smartcrop'); ?></button>
				<# } #>
				<button class="button-primary smartcrop-save" disabled="disabled"><?php _e('Save','wp-smartcrop'); ?></button>
			</div>
		</div>

		<div class="smartcrop-content">
			<div class="smartcrop-image-wrap box">
				<img id="smartcrop-image" src="{{ data.url }}" alt="" />
			</div>
		</div>
	</script>
