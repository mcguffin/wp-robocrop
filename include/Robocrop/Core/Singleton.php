<?php

namespace Robocrop\Core;

abstract class Singleton {

	/**
	 * Array containing derived class instances
	 */
	private static $instances = array();

	/**
	 * Getting a singleton.
	 *
	 * @return object single instance of Core
	 */
	public static function instance() {

		$class = get_called_class();

		if ( ! isset( self::$instances[ $class ] ) ) {
			$args = func_get_args();
			self::$instances[ $class ] = new $class( ...$args );
		}

		return self::$instances[ $class ];
	}

	/**
	 *	Prevent Instantinating
	 */
	private function __clone() { }

	/**
	 *	Protected constructor
	 */
	protected function __construct() {
	}
}
