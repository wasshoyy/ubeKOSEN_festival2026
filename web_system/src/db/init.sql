CREATE TABLE IF NOT EXISTS item
(
    item_id INT,
    item_name VARCHAR(45) NOT NULL,
    price INT NOT NULL,
    stock INT NOT NULL,
    PRIMARY KEY (item_id)
);

CREATE TABLE IF NOT EXISTS  seat
(
    seat_id INT,
    capacity INT NOT NULL,
    PRIMARY KEY (seat_id)
);

CREATE TABLE IF NOT EXISTS orders
(
    order_id INT GENERATED ALWAYS AS IDENTITY,
    seat_id INT,
    people INT,
    order_type VARCHAR(20) NOT NULL,
    CHECK (order_type IN ('EAT_IN', 'TAKE_OUT')),
    CHECK (people IS NULL OR people >= 1),
    CHECK (
        (order_type = 'EAT_IN'
            AND seat_id IS NOT NULL
            AND people IS NOT NULL)
        OR
        (order_type = 'TAKE_OUT'
            AND seat_id IS NULL
            AND people IS NULL)
    ),
    total_price INT NOT NULL,
    order_status VARCHAR(45) NOT NULL,
    order_time timestamptz NOT NULL DEFAULT now(),
    seat_released_at timestamptz,
    PRIMARY KEY (order_id),
    FOREIGN KEY (seat_id)
        REFERENCES seat(seat_id)
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
    order_item_id INT UNIQUE,
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




INSERT INTO item (item_id, item_name, price, stock)
VALUES
    (1, 'ABCスープ', 200, 100),
    (2, 'みそ汁', 200, 100),
    (3, 'コーンスープ', 200, 100)
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO seat (seat_id, capacity)
VALUES
    (1,4),
    (2,4),
    (3,4),
    (4,4)
ON CONFLICT (seat_id) DO NOTHING;

INSERT INTO robot (robot_id, connection_status, status)
VALUES
    (1, 'not_connected', 'Waiting_order'),
    (2, 'not_connected', 'Waiting_order'),
    (3, 'not_connected', 'Waiting_order')
ON CONFLICT (robot_id) DO NOTHING;
 