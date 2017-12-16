(function($){
	var opt = wp_robocrop_settings.options,
		l10n = wp_robocrop_settings.l10n,
		SizeRowView,
		SizesTableView,
		sizesView,
		$placeholder;
	// toggle sizes settings
	$(document).on('change','.robocrop-manage-sizes [type="checkbox"]',function(e){
		$(this).closest('tr').toggleClass('off',!$(this).prop('checked'))
	});
	SizesTableView = wp.media.View.extend({
		initialize:function(){
			wp.media.View.prototype.initialize.apply(this,arguments);
			this.$placeholder = this.$('.placeholder');
			this.items = [];
			return this;
		},
		addItem:function( data ) {
			if ( this.$placeholder.parent().length > 0 ) {
				this.$placeholder.remove();
			}
			var item = new SizeRowView({
				model		: data,
				controller	: this
			});
			this.$el.append( item.render().el );
			this.items.push( item );
			return this;
		},
		removeItem:function( item ) {
			var idx;
			item.$el.remove();
			if ( this.$el.children().length === 0 ) {
				this.$placeholder.appendTo(this.el);
			}
			idx = this.items.indexOf( item );
			if ( idx > -1 ) {
				this.items.splice(idx,1);
			}
			return this;
		},
		reset:function() {
			while( this.items.length ) {
				this.removeItem( this.items.pop() )
			}
			return this;
		}
	});
	SizeScaledView = wp.media.View.extend({
		tagName		: 'tr',
		className	: 'scaled-item',
		template	: wp.template('robocrop-settings-scaled-size'),
		events		: {
			'change [data-prop="scaled-key"]' : function(e) {
				var tpl = _.template('robocrop_sizes[<%= data.size_key %>][scaled][<%= data.key %>]'),
					data = _.extend( this.options.model, {key:$(e.target).val()} ),
					name = tpl({data:data});
				this.$('[data-prop="scaled-factor"]').attr('name',name );
			},
			'click .remove-scaled' : function(e){
				e.preventDefault();
				this.$el.remove();
			},
		},
		render: function() {
			var self = this;
			wp.media.View.prototype.render.apply(this,arguments);
			this.$('[data-prop="scaled-key"]').val(this.options.model.key);
			this.$('[data-prop="scaled-factor"]').val(this.options.model.factor);
			return this;
		},
		prepare:function(){
			return this.options.model;
		}
	});
	SizeRowView = wp.media.View.extend({
		tagName:'tr',
		className:'size-item',
		template: wp.template('robocrop-settings-size'),
		events:{
			'click .remove-size'	: function(e){
				e.preventDefault();
				this.controller.removeItem( this );
			},
			'click .add-scaled' : function(e) {
				e.preventDefault();
				this.addScaled({
					factor:2,
					key:'scaled',
					size_key:this.model.key
				});
			}
		},
		initialize:function(){
			wp.media.View.prototype.initialize.apply(this,arguments);
			return this;
		},
		render:function(){
			var self = this;
			wp.media.View.prototype.render.apply(this,arguments);
			this.$scaledList = this.$('.scaled .scaled-list');
			_.each(this.options.model, function( val, prop) {
				var $inp = self.$('[data-prop="'+prop+'"]'),
					scaled;
				if (_.isBoolean(val) ) {
					$inp.prop('checked',val);
				} else if ( _.isString(val) || _.isNumber(val) ) {
					$inp.val(val);
				} else if (prop === 'scaled') {
					_.each(val,function( factor, key ){
						self.addScaled({
							factor:factor,
							key:key,
							size_key:self.model.key
						});
					});
				}
			});
			return this;
		},
		addScaled:function(data){
			var scaled = new SizeScaledView({
				model:data
			});

			scaled.render().$el.appendTo(this.$scaledList);
		},
		prepare:function(){
			return this.options.model;
		}
	});
	function setSizes( sizes ) {
		sizesView.reset();
		_.each( sizes, function( size, i ){
			sizesView.addItem( size );
		});
	}
	function addSize() {
		sizesView.addItem({
			name:'',
			key:'image-size-' + (sizesView.items.length + 1),
			width:100,
			height:100,
			selectable:false,
			crop:true,
		});
	}
	function init() {
		sizesView = new SizesTableView( { el: $('.sizes-list').get(0) } );
		$placeholder = $('.sizes-list .placeholder');
		setSizes( opt.sizes.current );
		$('.robocrop-sizes-table .save-theme').prop('disabled', ! opt.theme_sizes_enabled );
		$('.robocrop-sizes-table .load-theme')
			.prop('disabled', ! opt.theme_sizes_enabled || opt.sizes.theme === false );
	}

	$(document)
		.ready(init)
		.on('click','.robocrop-sizes-table .add',function(e){
			e.preventDefault();
			addSize();
		})
		.on('click','.robocrop-sizes-table .reset',function(e){
			e.preventDefault();
			setSizes( opt.sizes.original );
		})
		.on('click','.robocrop-sizes-table .load-theme', function(e){
			e.preventDefault();
			setSizes( opt.sizes.theme );
		});

})(jQuery)
