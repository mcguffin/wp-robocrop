<table class="widefat robocrop-sizes-table">
	<thead>
		<tr>
			<th><?php _e( 'Name', 'wp-robocrop' ); ?></th>
			<!--th><?php _e( 'Slug', 'wp-robocrop' ); ?></th-->
			<th class="dimensions"><?php _e( 'Dimensions', 'wp-robocrop' ); ?></th>
			<!--th><?php _e( 'Height', 'wp-robocrop' ); ?></th-->
			<!--th><?php _e( 'Ratio', 'wp-robocrop' ); ?></th-->
			<!--th><?php _e( 'Crop', 'wp-robocrop' ); ?></th-->
			<th class="options"><?php _e( 'Options', 'wp-robocrop' ); ?></th>
			<th><?php _e( 'Scaled Sizes', 'wp-robocrop' ); ?></th>
			<th class="actions"></th>
		</tr>
	</thead>
	<tbody class="sizes-list">
		<tr class="placeholder">
			<td colspan="8"><em><?php _e( 'No custom image sizes yet', 'wp-robocrop' ); ?></em></td>
		</tr>
	</tbody>
	<tfoot>
		<tr>
			<td class="theme-tools" colspan="3">
				<label>
					<input type="hidden" name="robocrop_save_sizes" value="0" />
					<input type="checkbox" name="robocrop_save_sizes" value="1" class="save-theme" <?php checked(get_option('robocrop_save_sizes')) ?>></button>
					<?php _e( 'Save to Theme', 'wp-robocrop' ); ?>
				</label>

				<button name="robocrop-load-from-theme" value="1" class="button-secondary load-theme"><?php _e( 'Load from Theme', 'wp-robocrop' ); ?></button>
			</td>

			<td class="tools" colspan="5">
				<button class="button-secondary reset"><?php _e( 'Restore Dafaults', 'wp-robocrop' ); ?></button>
				<button class="button-primary add"><?php _e( 'Add Size', 'wp-robocrop' ); ?></button>
			</td>
		</tr>
	</tfoot>
</table>

<script type="text/html" id="tmpl-robocrop-settings-size">
	<td class="input">
		<input placeholder="<?php esc_attr_e('Name','wp-robocrop') ?>" data-prop="name" type="text" name="robocrop_sizes[{{{ data.key }}}][name]" />
		<!--code data-prop="key">{{ data.key }}</code-->
		<input placeholder="<?php esc_attr_e('Key','wp-robocrop') ?>" class="code" data-prop="key" type="text" name="robocrop_sizes[{{{ data.key }}}][key]" /></td>
	</td>
	<td class="input dimensions">
		<input data-prop="width" type="number" step="1" name="robocrop_sizes[{{{ data.key }}}][width]" />
		<span class="times">&times;</span>
		<input data-prop="height" type="number" step="1" name="robocrop_sizes[{{{ data.key }}}][height]" />
		<div class="ratio"><?php _e( 'Ratio', 'wp-robocrop' ); ?><span data-prop="ratio">{{ data.ratio }}</span> : 1</div>
	</td>
	<td class="options">
		<label>
			<input data-prop="crop" type="checkbox" name="robocrop_sizes[{{{ data.key }}}][crop]" />
			<?php _e( 'Crop', 'wp-robocrop' ); ?>
		</label>
		<label>
			<input data-prop="selectable" type="checkbox" name="robocrop_sizes[{{{ data.key }}}][selectable]" />
			<?php _e( 'Selectable', 'wp-robocrop' ); ?>
		</label>
	</td>
	<td class="scaled">
		<table>
			<thead>
				<tr>
					<th class="scaled-id"><?php _e('ID','wp-robocrop') ?></th>
					<th class="factor"><?php _e('Factor','wp-robocrop') ?></th>
					<th class="actions"></th>
				</tr>
			</thead>
			<tbody class="scaled-list">
				<td colspan="3" class="scaled-placeholder">
					<em><?php _e( 'No scaled sizes', 'wp-robocrop' ); ?></em>
				</td>
			</tbody>
			<tfoot>
				<tr>
					<td colspan="3">
						<button class="button-secondary add-scaled"><?php _e('Add','wp-robocrop') ?></button>
					</td>
				</tr>
			</tfoot>
		</table>

	</td>
	<td class="actions">
		<a href="#" role="button" class="dashicons dashicons-minus remove remove-size"><span class="screen-reader-text"><?php _e('Remove Size','wp-robocrop') ?></span></a>
	</td>
</script>

<script type="text/html" id="tmpl-robocrop-settings-scaled-size">
	<td class="scaled-id">
		<input type="text" class="code" data-prop="scaled-key" />
	</td>
	<td class="scaled-factor">
		<input type="number" step="any" name="robocrop_sizes[{{{ data.size_key }}}][scaled][{{{ data.key }}}]" data-prop="scaled-factor" />
	</td>
	<td class="actions">
		<a href="#" role="button" class="dashicons dashicons-minus remove remove-scaled"><span class="screen-reader-text"><?php _e('Remove','wp-robocrop') ?></span></a>
	</td>
</script>
