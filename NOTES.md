Control Flow
============

Upload
------

async-upload.php
	calls media_handle_upload( 'async-upload', $post_id );
		wp_handle_upload()
		wp_insert_attachment()
		wp_generate_attachment_metadata()
			wp_create_image_subsizes()
				@filter big_image_size_threshold
				$editor->resize()
					image_resize_dimensions()
						@filter image_resize_dimensions() 
							Attachment::image_resize_dimensions
								::get_current_cropdata()
									::generate_cropdata()
										MediaHelper::crop_from_focuspoint()
		wp_update_attachment_metadata()