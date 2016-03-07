	<script type="text/html" id="tmpl-smartcrop-select-item">
		<input type="radio" name="smartcrop-select-ratio" value="{{ data.ratio }}" id="smartcrop-select-{{ data.ratiokey }}" />
		<label for="smartcrop-select-{{ data.ratiokey }}">
			<strong>{{ data.ratio }} : 1</strong><br />
			<small>{{{ data.sizenames }}}</small>
		</label>
	</script>