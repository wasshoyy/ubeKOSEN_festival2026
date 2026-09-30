CREATE TABLE IF NOT EXISTS item
(
    item_id INT,
    item_name VARCHAR(45) NOT NULL,
    price INT NOT NULL,
    stock INT NOT NULL,
    PRIMARY KEY (item_id)
);

CREATE TABLE IF NOT EXISTS orders
(
    order_id INT GENERATED ALWAYS AS IDENTITY,
    people INT,
    order_type VARCHAR(45) NOT NULL,
    total_price INT NOT NULL,
    order_status VARCHAR(45) NOT NULL,
    order_time timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (order_id)
);

CREATE TABLE IF NOT EXISTS sessions
(
    session_id VARCHAR(64),
    current_order_id INT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id),
    FOREIGN KEY (current_order_id)
        REFERENCES orders(order_id),
    UNIQUE (current_order_id)
);

CREATE TABLE IF NOT EXISTS order_item
(
    order_item_id INT GENERATED ALWAYS AS IDENTITY,
    order_id INT,
    item_id INT,
    order_qty INT NOT NULL,
    unit_price INT NOT NULL,
    PRIMARY KEY (order_item_id),
    FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,
    FOREIGN KEY (item_id)
        REFERENCES item(item_id)
);


CREATE TABLE IF NOT EXISTS  seat
(
    seat_id INT,
    seat_status VARCHAR(45) NOT NULL,
    current_order_id INT,
    PRIMARY KEY (seat_id),
    FOREIGN KEY (current_order_id)
        REFERENCES orders(order_id),
    UNIQUE (current_order_id)
);

CREATE TABLE IF NOT EXISTS robot
(
    robot_id INT,
    connection_status VARCHAR(45) NOT NULL,
    status VARCHAR(45) NOT NULL,
    PRIMARY KEY (robot_id)
);

CREATE TABLE IF NOT EXISTS delivery_tasks
(
    delivery_tasks_id INT GENERATED ALWAYS AS IDENTITY,
    order_item_id INT,
    robot_id INT,
    cook_status VARCHAR(45) NOT NULL,
    delivery_status VARCHAR(45) NOT NULL,
    PRIMARY KEY (delivery_tasks_id),
    FOREIGN KEY (order_item_id)
        REFERENCES order_item(order_item_id)
        ON DELETE CASCADE,
    FOREIGN KEY (robot_id)
        REFERENCES robot(robot_id)
);
